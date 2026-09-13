import React, { useEffect, useState, useRef, useContext } from 'react'
import "./styles.css"
import { Box, CircularProgress, Grow, Menu, MenuItem, Popover, Typography } from '@mui/material'
import Episodes from './episodes'
import { Close } from "@mui/icons-material"
import { addToFavs, getFavourites, removeFromFavs, removeMovieFromRecents, saveWatchedContent } from '../../firebase/functions'
import { AppContext } from '../../contexts/app'
import { useBeforeunload } from 'react-beforeunload'
// import { useRouter } from 'next/router'
// import Image from 'next/image'
import backBtn from "../../assets/backBtn.svg"
import seekBack from "../../assets/seekBack.svg"
import playBtn from "../../assets/playBtn.svg"
import pauseBtn from "../../assets/pauseBtn.svg"
import seekForward from "../../assets/seekForward.svg"
import episodesIcon from "../../assets/episodes.svg"
import aspectRatio from "../../assets/aspectRatio.svg"
import speedIcon from "../../assets/speed.svg"
import nextEpisode from "../../assets/nextEpisode.svg"
// import { concatUrl } from '@/methods/concatUrl'
import { AES } from 'crypto-js'
import { useNavigate } from 'react-router-dom'
import minimizeIcon from "../../assets/minimize.svg"
import maximizeIcon from "../../assets/maximize.svg"

const Player = ({
  src,
  type,
  onNext,
  episodes,
  selectedSeason,
  watchedEpisodes,
  series,
  timeline,
  close,
  playEpisode,
  currentPlaying,
  setCurrentPlaying,
  info,
  loginType,
  id,
  seasonChanged,
}) => {
  const [player, setPlayer] = useState(null)
  const [speedOptionsShow, setSpeedOptionsShow] = useState(false);
  const [controlsActive, setControlsActive] = useState(true);
  const [playActive, setPlayActive] = useState(true);
  const playerRef = useRef(null);
  const episodeOptionRef = useRef(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false);
  const [finalAddress, setFinalAddress] = useState(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [lastEpisode, setLastEpisode] = useState("");
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [movieInfo, setMovieInfo] = useState(null);
  const [favourites, setFavourites] = useState([]);
  // const [episodes, setEpisodes] = useState([]);
  const { user, alert } = useContext(AppContext);

  const [intervalPassed, setIntervalPassed] = useState(false);


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
    if (series) {
      const seasons = Object.keys(series.episodes).length
      const lastSeasonEpisodes = series.episodes[seasons];
      const endEpisode = lastSeasonEpisodes[lastSeasonEpisodes.length - 1];
      setLastEpisode(endEpisode.id);
    }
  }, [series]);


  useEffect(() => {
    setTimeout(() => {
      setIntervalPassed(true);
    }, 2000);
  }, [])

  const getFavs = async (address) => {
    try {
      const response = await getFavourites(type === 'movies' ? 'Movie' : 'Series', address);
      const keys = response.val() ? Object.keys(response.val()) : [];
      setFavourites(keys);
    } catch (error) {
      console.log('ERROR', error);
    };
  };


  useEffect(() => {
    if (controlsActive) {
      if (!showEpisodes) {
        setTimeout(() => {
          setControlsActive(false);
          setSpeedOptionsShow(false)
        },2000);
      }
    };
    if (playerRef.current && videoLoaded) {
      const nodes = playerRef.current.childNodes[0].childNodes[1].childNodes[1].childNodes;
      nodes.forEach(node => {
        if (node.className === "fp-controls") {
          node.style.opacity = controlsActive ? 1 : 0;
          node.style.visibility = controlsActive ? "visible" : "hidden";
        }
      })
    };
  }, [controlsActive, playerRef])

  useEffect(() => {
    setPlayer(window.flowplayer("#player-wrapper", {
      autoplay: true,
      ratio: "1:1",
      controls: false,
      muted: false,
      key: "webtvsecretggkey ngt8XJKe",
      clip: {
        sources: [
          {
            type: "video/mp4",
            src: src,
          },
        ]
      },
    }));
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev === 95) {
          return 95
        } else {
          return prev + 5
        }
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setFullscreenAvailable(document.fullscreenEnabled ||
      document.mozFullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.msFullscreenEnabled)
  }, []);

  useEffect(() => {
    if (player) {
      // changeOrientation("lock")
      player.on("ready", () => {
        // window.alert("Data has been loaded")
        setVideoLoaded(true);
      });
      player.on("loadedmetadata", () => {
        window.alert("Video Loaded")
      })
      player.on("progress", () => {
        setVideoLoaded(true)
        if (!videoStarted) {
          setVideoStarted(true);
        }
      })
      player.on("error", () => {
        setError(true);
      });
      player.on("buffer", () => {
        // setVideoLoaded(false)
      });
      player.on("finish", () => {
        removeMovie();
      });
      player.on('pause', () => {
        setPlayActive(false);
        setControlsActive(true);
        setVideoPaused(true);
      });
      player.on('resume', () => {
        setPlayActive(true);
        setVideoPaused(false)
      });
    }
  }, [player]);

  useEffect(() => {
    if (user) {
      setFinalAddress(user.dbAddress);
      getFavs(user.dbAddress)
    }
  }, [user]);

  useEffect(() => {
    if (videoStarted) {
      if (timeline) {
        handleSeek.jump(timeline);
        setVideoLoaded(false)
      }
    }
  }, [videoStarted]);

  useEffect(() => {
    if (info) {
      const movieDetails = {
        name: loginType === 'one-stream-panel' ? info.vod.name : loginType === 'player-api' ? info?.info?.name : info.name ? info.name : info.title,
        streamId: loginType === 'one-stream-panel' ? info.vod.stream_id : loginType === 'player-api' ? info.movie_data.stream_id : null,
      }
      setMovieInfo(movieDetails);
    }
  }, [info]);

  const handleSeek = {
    forward: () => player.seek(player.video.time + 10),
    back: () => player.seek(player.video.time - 10),
    jump: (time) => player.seek(time),
    playPause: () => {
      setPlayActive(!playActive);
      if (playActive) {
        player.pause()
      } else {
        player.play();
      }
    }
  }

  const handleSpeed = (e) => {
    const speed = Number(e);
    player.speed(speed);
    setSpeed(speed);
    setSpeedOptionsShow(false)
  }

  const handleControls = (e) => {

    // if (videoLoaded) {
    //   const controls = playerRef.current.childNodes[0].childNodes[1].childNodes[1].childNodes[11];

    // if (controls) {
    //   controls.style.opacity = 1;
    //   controls.style.pointerEvents = "auto";
    //   setTimeout(() => {
    //     controls.style.opacity = 0;
    //     controls.style.pointerEvents = "none";
    //   }, 10000);
    // }
    // }
    setControlsActive(true);
  };

  const changeOrientation = (type) => {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      // Mobile device
      if (type === "lock") {
        document.documentElement.requestFullscreen();
        screen.orientation.lock("landscape")
      } else {
        document.documentElement.requestFullscreen();
        screen.orientation.lock("portrait")
      }
    }
  }

  const handleClick = e => {
    const episodesContainer = document.getElementById("episodes-container");
    const episodeOption = episodeOptionRef.current;
    if (!episodesContainer?.contains(e.target) && !episodeOption?.contains(e.target)) {
      setShowEpisodes(false);
      setControlsActive(true)
    }
  }

  const handleNextEpisode = async () => {
    try {
      await saveTimeline()
      onNext();
    } catch (error) {
      onNext();
      
    }
    player.stop();
  }

  const removeMovie = async () => {
    // setVideoFinished(true);
    // changeOrientation("unlock")
    if (type === "series") {
      const seasons = Object.keys(series.episodes).length
      const lastSeasonEpisodes = series.episodes[seasons];
      const endEpisode = lastSeasonEpisodes[lastSeasonEpisodes.length - 1];
      setLastEpisode();
      changeOrientation("unlock")
      if (String(endEpisode.id) !== String(currentPlaying.id)) {
        await saveTimeline()
        onNext();
      } else {
        try {
          await removeMovieFromRecents(id, 'Series', user.dbAddress, 'remove');

        } catch (error) {
          console.log(error)

        }
        handleClose();

      }
    }
    else if (
      type === 'series-m3u'
    ) {
      try {
        await removeMovieFromRecents(id, 'Series', finalAddress);
      } catch (error) {
        console.log(error)
      }
      handleClose();

    }
    else {
      try {
        await removeMovieFromRecents(id, 'Movie', finalAddress);
      } catch (error) {
        console.log(error)
      }
      // changeOrientation("unlock")
      handleClose();
    }
    // saveTimeline();
    // handleClose()
  }

  const isLandscape = () => {
    return window.innerWidth > window.innerHeight;
  }

  const isPortrait = () => {
    return window.innerWidth < window.innerHeight;
  }

  const saveTimeline = async () => {
    const { time } = player.video;
    const duration = player.video.duration;
    if (time > 10) {
      if (type !== 'm3u') {
        if (type === "series") {
          try {
            await saveWatchedContent.series(id, user.dbAddress, {
              season: String(currentPlaying.season),
              timeline: time,
              thumbnail: series.info.cover,
              episodeName: currentPlaying.title,
              duration: duration,
              lastWatched: "true"
            }, currentPlaying.id);
          } catch (error) {
            console.log(error);
          }
        }
        else if (type === 'series-m3u') {
          try {
            await saveWatchedContent.series(id, user.dbAddress, {
              season: '',
              episode: '',
              timeline: time,
              thumbnail: '',
              duration: duration
            });
          } catch (error) {
            console.log(error);
          }
        } else {
          try {
            await saveWatchedContent.movie(id, user.dbAddress, {
              timeline: time,
              thumbnail: info?.info?.movie_image ? info?.info?.movie_image : "",
              duration: duration
            });
          } catch (error) {
            console.log(error);
          };
        };
      }

    };
  };


  const handleBack = async () => {
    // changeOrientation("unlock")
    setError(false);
    if (!videoFinished) {
      saveTimeline();
    }
    if (fullscreen) {
      document.exitFullscreen();
    }
    handleClose();
  };

  const handleFullScreen = () => {

    if (fullscreen) {
      document.exitFullscreen();
    } else {
      // document.getElementById('player').requestFullscreen();
      if (document.documentElement.requestFullscreen) {
        // Most browsers
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        // Firefox (Gecko) 
        document.documentElement.mozRequestFullScreen();

      } else if (document.documentElement.webkitRequestFullscreen) {
        // Safari (WebKit)
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        // IE/Edge
        document.documentElement.msRequestFullscreen();
      }
    }
  };



  const handleClose = () => {
    player.shutdown();
    close();
  };

  useBeforeunload(e => {
    if (player) {
      e.preventDefault()
      saveTimeline()
    };
  });

  const speedOptions = [1, 2, 3, 4];

  const onChangeFullscreen = () => {
    setFullscreen(document.fullscreenElement);
  };




  useEffect(() => {
    document.addEventListener('fullscreenchange', onChangeFullscreen);
    return () => document.removeEventListener("fullscreenchange", onChangeFullscreen)
  }, []);

  const handleAddToFav = async () => {
    const isFavourite = favourites.filter(item => item === id).length > 0;
    try {
      if (isFavourite) {
        await removeFromFavs(id, type === 'movies' ? 'Movie' : 'Series', finalAddress);
        alert.toggle({
          show: true,
          title: 'Removed from Favourites',
          type: 'success'
        });
      } else {
        await addToFavs(id, type === 'movies' ? 'Movie' : 'Series', finalAddress);
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
    getFavs(finalAddress)
  }

  useEffect(() => {
    if (player) {
      if (showEpisodes) {
        player.pause()
      } else {
        player.resume()
      }
    }
  }, [showEpisodes, player])


  return (
    <div

      id='player'
      onClick={handleClick}
      onMouseMove={handleControls}
      onTouchStart={handleControls}
      className="livePlayer video-player1 video-player-container"
      ref={playerRef}>
      <div style={{
        background: 'black'
      }} id="player-wrapper">
      </div>
      {
        controlsActive &&
        <img onClick={handleBack} className='back-btn' src={backBtn} alt="back-btn" />
      }
      {
        controlsActive &&
        <svg onClick={handleAddToFav} className='add-to-fav-icon' width="40" height="36" style={{ zIndex: 9999999, position: 'absolute', top: '20px', right: '20px', padding: '7px' }} viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill={
          favourites.filter(item => item === id).length > 0 ? "#FF0000" :
            "white"
        } /> </svg>
      }
      {
        controlsActive ?

          type === "series" ?
            <h3 className='current-playing-title' >
              {currentPlaying
                &&
                currentPlaying.title
              }
            </h3>
            :
            <h3 className='current-playing-title' >{movieInfo?.name}</h3> : null

      }
      {
        type === "series" &&
        <Episodes
          currentPlaying={currentPlaying}
          setCurrentPlaying={(epsd) => {
            setCurrentPlaying(epsd)
          }}
          watchedEpisodes={watchedEpisodes}
          seriesId={id}
          seasonChanged={seasonChanged}
          series={series}
          player={player}
          playEpisode={async (data) => {
            saveTimeline().then(() => {
                playEpisode(data)
            })
       }}
          show={showEpisodes}
          handleShowEpisode={() => setShowEpisodes(false)}
          episodes={episodes} />
      }
      {
        videoLoaded ?
          <>
            <div className={
              `${controlsActive ?
                "seek-options"
                : "seek-options-notShow"}`
            }>
              <img alt="placeholder" onClick={handleSeek.back} src={seekBack} />
              <img alt="placeholder" onClick={handleSeek.playPause} src={!playActive ? playBtn : pauseBtn} />
              <img alt="placeholder" onClick={handleSeek.forward} src={seekForward} />
            </div>
            <div className={`${controlsActive ? "bottom-options" : "bottom-options-notShow"}`}>
              {type === "series" && <div ref={episodeOptionRef} onClick={() => {
                setShowEpisodes(!showEpisodes);
              }} className="option">
                <img alt="placeholder" src={episodesIcon} />
                {!isPortrait() && <p>Episodes</p>}
              </div>
              }
              {
                fullscreenAvailable &&
                <div onClick={handleFullScreen} className="option">
                  <img alt="placeholder" src={fullscreen ? minimizeIcon: maximizeIcon} />
                  {!isPortrait() && <p>{ fullscreen ? 'Minimize': 'Fullscreen' } </p>}
                </div>
              }
              <div className="option">
                <div onClick={() => setSpeedOptionsShow(!speedOptionsShow)} className='sub-option'>
                  <img alt="placeholder" src={speedIcon} />
                  {!isPortrait() && <p>Speed {`(${speed}x)`}</p>}
                </div>
                {
                  speedOptionsShow &&
                  <div className='speed-menu' >

                    <div className='dropdown-container'>
                      {
                        speedOptions.map(option => <p className={speed === option ? "current-selected" : ""} onClick={() => handleSpeed(option)}>{option}x</p>)
                      }
                    </div>
                  </div>
                }

              </div>
              {
                type === "series" && lastEpisode !== currentPlaying.id &&
                <div onClick={handleNextEpisode} className="option">
                  <img alt="placeholder" src={nextEpisode} />
                  {!isPortrait() && <p>Next Episode</p>}
                </div>
              }

            </div>
          </> :
          <div className='progress-loader-container'>
            <CircularProgress className='progress-loader' />
            <p className='progress'>{progress}%</p>
          </div>

      }
      {
        error &&
        <div className='invalid-user-popupp'>
          <Close className='cross-icon' color='error' />
          <p className='invalid-title'>Sorry, this video can not be played, Try again later</p>
          <button onClick={handleBack} className='ok-btn'>OK</button>
        </div>
      }/
    </div >


  )
}


export default Player