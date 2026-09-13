import React, { useState, useEffect, useRef, useContext } from 'react'
import "./styles.css"
import backBtn from "../../../../assets/backBtn.svg"
import nextEpisode from "../../../../assets/nextEpisode.svg"
import episodes from "../../../../assets/episodes.svg"
import aspectRatio from "../../../../assets/aspectRatio.svg"
import playBtn from "../../../../assets/playBtn.svg"
import pauseBtn from "../../../../assets/pauseBtn.svg"
import { concatUrl } from '../../../../helpers/methods/concatUrl';
import { AppContext } from '../../../../contexts/app';
import { addToFavs, getFavourites, removeFromFavs } from '../../../../firebase/functions';
import { Backdrop, CircularProgress } from '@mui/material'
import minimizeIcon from "../../../../assets/minimize.svg"
import maximizeIcon from "../../../../assets/maximize.svg"

const LiveTVPlayer = ({
  src,
  onPlayerReady,
  currentStreams,
  onPreviousChannel,
  onNextChannel,
  currentStream,
  onclose,
  opened,
  favourites = [],
  playingStream,
  getFavouriteChannels,
  onfullscreen,
  currentEpg,
  restart }) => {
  const [player, setPlayer] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [previousExists, setPreviousExists] = useState(false);
  const [nextExists, setNextExists] = useState(false);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(null)
  const [controlsActive, setControlsActive] = useState(false);
  const [controlsTimer, setControlsTimer] = useState(null);
  const [error, setError] = useState(false);
  const [fullwidth, setFullwidth] = useState(false);
  const [playActive, setPlayActive] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [playing, setPlaying] = useState(false);
  const { user, alert } = useContext(AppContext);

  const playerRef = useRef(null);
  // const { view } = useRouter().query;

  useEffect(() => {
      setFullscreenAvailable(document.fullscreenEnabled ||
          document.mozFullscreenEnabled ||
          document.webkitFullscreenEnabled ||
          document.msFullscreenEnabled)
  }, []);


  useEffect(() => {
      setPlayer(window.flowplayer("#player-wrapperr", {
          autoplay: true,
          ratio: "1:1",
          controls: false,
          muted: false,
          clip: {

              sources: [
                  {
                      type: "application/x-mpegURL",
                      src
                  }
              ]
          },
      }));
  }, []);


useEffect(() => {
  const intervalId = setInterval(() => {
    setCurrentTime(formatTime(new Date()));
  }, 1000);

  // Cleanup interval on component unmount
  return () => clearInterval(intervalId);
}, []);

const formatTime = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  // Convert from 24-hour to 12-hour format
  hours = hours % 12 || 12;

  const formattedHours = hours < 10 ? `0${hours}` : hours;

  return `${formattedHours}:${formattedMinutes}`;
};

  useEffect(() => {
      if (player) {
          player.on("ready", () => {

              onPlayerReady();
              setPlayerReady(true);
              setError(false);
          });
          player.on("error", () => {
              setError(true);
          });
       
          player.on("progress", () => {
              setPlayActive(true);
              setPlaying(true);
          });
          player.on('pause', () => {
              setPlayActive(false);
          });
          player.on('resume', () => {
              setPlayActive(true);
          });

          return () => {
              if (isIos()) {
                  player?.unload();
              } else {
                  player?.engine?.unload();
              }
          }
      };
  }, [player]);

  const isIos = () => {
      return [
          'iPad Simulator',
          'iPhone Simulator',
          'iPod Simulator',
          'iPad',
          'iPhone',
          'iPod'
      ].includes(navigator.platform)
          // iPad on iOS 13 detection
          || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  }

  useEffect(() => {
      if (opened && player) {
          setFullwidth(true);
          onfullscreen(true);
      }
  }, [opened, player])

  const handleAspectRatio = () => {
      if (fullscreen) {
          document.exitFullscreen();
          onclose();

      } else {
          document.getElementById('live-playerrr').requestFullscreen();
      }
  };

  const onChangeFullscreen = () => {
      setFullscreen(document.fullscreenElement);
      onfullscreen(document.fullscreenElement);
  }


  useEffect(() => {
      document.addEventListener('fullscreenchange', onChangeFullscreen);
      return () => document.removeEventListener("fullscreenchange", onChangeFullscreen)
  }, [])

  useEffect(() => {
      if (user) {
          if (currentStreams.length === 1) {
              setPreviousExists(false);
              setNextExists(false);
              setCurrentStreamIndex(0);
          } else {
              currentStreams.map((stream, index) => {
                  if (user.loginType === 'm3u' ? concatUrl(stream.url) === currentStream.stream_id : String(stream.stream_id) === String(currentStream.stream_id)) {
                      setCurrentStreamIndex(index);
                      if (index > 0) {
                          setPreviousExists(true);
                      } else {
                          setPreviousExists(false);
                      }
                      if (index === currentStreams.length - 1) {
                          setNextExists(false)
                      } else {
                          setNextExists(true)
                      }
                  }
              });
          }
      }
  }, [currentStreams, currentStream, user]);


  function calculatePercentage(start, end, current) {
      function timeToMinutes(time) {
          var parts = time.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }


      var startMinutes = timeToMinutes(start);
      var endMinutes = timeToMinutes(end);
      var currentMinutes = timeToMinutes(current);

      var totalDuration = endMinutes - startMinutes;
      var elapsedTime = currentMinutes - startMinutes;

      return (elapsedTime / totalDuration) * 100;
  }
  useEffect(() => {
      if (playerRef.current) {
          const fpUi = playerRef.current.childNodes[1].childNodes[5].childNodes;
          fpUi.forEach(node => {
              if (node.className === "fp-controls") {
                  node.style.bottom = (fullscreen || fullwidth) ? '90px' : '40px';
                  node.style.opacity = controlsActive ? 1 : 0;
                  node.style.visibility = controlsActive ? "visible" : "hidden";
              }
          })
      }
  }, [controlsActive, fullscreen, fullwidth]);

  const handleAddToFav = async () => {
      const isFavourite = favourites.filter(item => String(item) === String(currentStream.stream_id)).length > 0;
      try {
          if (isFavourite) {
              await removeFromFavs(currentStream.stream_id, 'LiveTv', user.dbAddress);
              alert.toggle({
                  show: true,
                  title: 'Removed from Favourites',
                  type: 'success'
              });
          } else {
              await addToFavs(currentStream.stream_id, 'LiveTv', user.dbAddress);
              alert.toggle({
                  show: true,
                  title: 'Added to Favourites',
                  type: 'success'
              });
          }

      } catch (error) {
          alert.toggle({
              show: true,
              title: 'Something went wrong !',
              type: 'error'
          });
      };
      getFavouriteChannels()
  }

  const handleMouseOver = () => {
      if (controlsTimer) {
          clearTimeout(controlsTimer)
      }
      setControlsActive(true);
      const timer = setTimeout(() => {
          setControlsActive(false);
      }, 2000);
      setControlsTimer(timer);
  };

  const handleBack = () => {
      if (fullwidth) {
          setFullwidth(false)
      }
      if (fullscreen) {
          document.exitFullscreen();
      }
      onclose();
  };

  const handleChannelList = () => {
      setFullwidth(false);
      if (fullscreen) {
          document.exitFullscreen();
      }
      onclose();
  };

  const handlePlayPause = () => {
      if (playActive) {
          player.pause()
      } else {
          player.play();
      }
  };

  const controlsStyles = {
      transition: ".3s",
      opacity: controlsActive && !error ? 1 : 0,
      visibility: controlsActive && !error ? "visible" : "hidden",
      display: error ? "none": ''
  }

  const Loading = () => <Backdrop sx={{
    background: 'black',
    position: "absolute",
    top: 0,
    zIndex: 9,
    left: 0,
    width: '100%',
    height: '100%'
}} open={true}>
    <CircularProgress sx={{ color: "white" }} />
</Backdrop>

  return (
    <>
   
   
    <div
      id="live-playerrr"
      className={`live-player${fullwidth ? '-fullscreen' : ''}`}
      onMouseMove={handleMouseOver}
    >
       {

     !error && !playing && Loading()
    }
      {/* <svg onClick={handleAddToFav} className='add-to-fav-icon' width="40" height="36" style={{ zIndex: 9999999, position: 'absolute', top: '12px', right: '20px', background: '#0d1e23', padding: '7px', display: ((controlsActive && fullscreen) || (controlsActive && fullwidth)) ? "block" : "none", cursor: "pointer" }} viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill={
              favourites.filter(item => item === currentStream.stream_id).length > 0 ? "#FF0000" :
                  "white"
          } /> </svg> */}
      <img
        style={{
          zIndex: 9999999,
          ...controlsStyles,
          display: !(fullwidth || fullscreen) && 'none'
        }}
        onClick={handleBack}
        className="back-btn"
        src={backBtn}
        alt="back-btn"
      />
      {currentEpg && !fullscreen && !error && (
        <div style={controlsStyles} className="progress-bar-wo-fullscreen">
          <div
            style={{
              width: calculatePercentage(currentEpg.start, currentEpg.end, currentTime) > 100 ? 100 : calculatePercentage(currentEpg.start, currentEpg.end, currentTime)   + '%'
            }}
            className="completed-progress"
          ></div>
        </div>
      )}
      {currentEpg && !fullscreen && !error && (
        <div style={controlsStyles} className="current-program-timings">
          <p>{currentTime}</p>
          <p>{currentEpg.end.slice(0, 5)}</p>
        </div>
      )}
  
      <div id="player-wrapperr" ref={playerRef}>
        {
          <img
            style={{
              display: (error || !playerReady) && 'none',
              ...controlsStyles
            }}
            onClick={handlePlayPause}
            className="play-pause-btn"
            src={playActive ? pauseBtn : playBtn}
            alt="back-btn"
          />
        }
        <h3 style={controlsStyles} className="channel-name">
          {playingStream
            ? playingStream.name
            : currentStreams && currentStreams[currentStreamIndex]?.name}
        </h3>
        {
          <svg
            onClick={handleAddToFav}
            className="add-to-fav-icon"
            width="40"
            height="36"
            style={{
              zIndex: 9999999,
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '7px',
              display: controlsActive && fullscreen ? 'block' : 'none',
              cursor: 'pointer'
            }}
            viewBox="0 0 30 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {' '}
            <path
              d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z"
              fill={
                favourites.filter((item) => String(item) === String(currentStream.stream_id)).length > 0
                  ? '#FF0000'
                  : 'white'
              }
            />{' '}
          </svg>
        }

        {
          <div
            style={controlsStyles}
            className={`live-bottom-controls${fullscreen || fullwidth ? '-fullscreen' : ''}`}
          >
            {previousExists && fullscreen && (
              <div onClick={() => onPreviousChannel(currentStreamIndex)} className="option">
                <img src={nextEpisode} alt="next-episodes" />
                <p>Previous Channel</p>
              </div>
            )}
            {/* {(fullscreen || fullwidth) && (
              <div onClick={handleChannelList} className="option">
                <img src={episodes} alt="episodes" />
                <p>Channels List</p>
              </div>
            )} */}
                {fullscreenAvailable && !fullscreen && (
              <div onClick={handleAspectRatio} className="full-screen-icon-container">
                <img src={maximizeIcon} alt="aspect-ratio" className='full-screen-icon' />
                {/* <p>Aspect Ratio</p> */}
                {/* <FullscreenIcon /> */}
              </div>
            )}
            {fullscreenAvailable && fullscreen && (
              <div onClick={handleAspectRatio} className="option">
                <img src={minimizeIcon} alt="aspect-ratio" />
                <p>Minimize</p>
              </div>
            )}
            {nextExists && fullscreen && (
              <div
                onClick={async () => {
                  player.engine.unload()
                  setTimeout(() => {
                    onNextChannel(currentStreamIndex)
                  }, 100)
                }}
                className="option"
              >
                <img src={nextEpisode} alt="next-episodes" />
                <p>Next Channel</p>
              </div>
            )}
          </div>
        }
        {error && (
          <div className="error-modal">
            <p>There is some error playing the video</p>;
            <button onClick={() => restart(currentStreamIndex)}>Try again</button>
          </div>
        )}
        {  fullscreen && (
          <div style={controlsStyles} className="current-program-info-container">
            <div className="current-program-info">
              <div className="image-and-info">
                <img src={currentStream.stream_icon} />
                <div className="current-program-channel-details">
                  <h2 className="current-channel">{currentStream.name}</h2>
                  <p className="current-program-info">{currentEpg && atob(currentEpg.title)}</p>
                </div>
              </div>
              {currentEpg && (
                <div className="current-program-timing">
                  <p>
                    {currentTime} / {currentEpg.end.slice(0, 5)}
                  </p>
                </div>
              )}
            </div>
            {currentEpg && (
              <div className="progress-bar">
                <div
                  style={{
                    width:
                    calculatePercentage(currentEpg.start, currentEpg.end, currentTime) > 100 ? 100 : calculatePercentage(currentEpg.start, currentEpg.end, currentTime)+ '%'
                  }}
                  className="completed-progress"
                ></div>
              </div>
            )}
          </div>
        )}
        {fullscreen && <div className="live-full-screen-gradient"></div>}
      </div>
    </div>
    </>
  )
}

export default LiveTVPlayer