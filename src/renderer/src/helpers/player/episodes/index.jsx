import React, { useEffect, useState, useContext } from 'react'
import "./styles.css"
import Scrollable from '../../../helpers/scrollable';
import { Cancel } from '@mui/icons-material';
// import Image from 'next/image';
import placeholderImage from "../../../assets/placeholder.png"
import Watched from '../../../helpers/progress';
import { getDatabase, onValue, ref } from 'firebase/database';
import { app } from '../../../firebase';
import { AppContext } from '../../../contexts/app';

const Episodes = ({
  show,
  handleShowEpisode,
  onMouseMove,
  watchedEpisodes,
  playEpisode,
  series,
  player,
  currentPlaying,
  seriesId,
  setCurrentPlaying,
  seasonChanged }) => {

  const [seasons, setSeasons] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const { user, currentPlayer } = useContext(AppContext)

  const secondsToHms = (d) => {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? "min" : " min") : "";
    return hDisplay + " " + mDisplay;
  }

  const handlePlay = (episode) => {
    const data = {
      episode_num: episode.episode_num,
      episodeId: episode.id,
      season: episode.season
    }
    playEpisode(data);
    setTimeout(() => {
      setCurrentPlaying(episode)
    }, 500);
  };

  useEffect(() => {
    if (series) {
      setSeasons(Object.keys(series.episodes));
      setEpisodes(series.episodes);
    }
  }, [series]);

  useEffect(() => {
    if (currentPlaying) {
      setSelectedSeason(currentPlaying.season);
    }
  }, [currentPlaying]);


  const handleSeason = e => {
    const { value } = e.target;
    setSelectedSeason(value)
    seasonChanged(value)
  }
  const database = getDatabase(app);


  // useEffect(() => {
  //   if(user && seriesId){
  //     onValue(ref(database, `${user.dbAddress}/Recent/Series/${seriesId}`), (snapshot) => {
  //       const epsdKeys = snapshot.val() ?  Object.keys(snapshot.val()) : [];
  //       setWatchedEpisodes({
  //         episodes: snapshot.val(),
  //         keys: epsdKeys
  //     });
  //   });
  //   }
  // },[user,seriesId])

  const Episode = ({ episode, show }) => {
    const ratingCount = Math.round(episode.info.rating ? episode.info.rating : 0 / 2)
    const rating = () => Array(ratingCount).fill(1).map(() => <svg width="18" height="33" viewBox="0 0 35 33" style={{ marginLeft: 5 }} fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.479492 12.8428C0.667049 12.2289 0.995185 11.7264 1.62263 11.4926C2.17676 11.2861 2.77003 11.32 3.34658 11.2634C4.9531 11.1057 6.56103 10.9658 8.16861 10.8203C9.24057 10.7231 10.3118 10.6188 11.3848 10.5388C11.7073 10.5146 11.8991 10.4306 12.0397 10.096C13.2277 7.26702 14.4434 4.4494 15.646 1.62679C16.1741 0.386855 17.5023 -0.016018 18.4935 0.771578C18.786 1.00398 18.9583 1.31752 19.1028 1.65527C20.3203 4.50777 21.5442 7.35742 22.7564 10.2121C22.8404 10.4103 22.939 10.5021 23.1543 10.5203C24.9708 10.674 26.7869 10.8335 28.6023 10.9982C29.9583 11.1214 31.3143 11.2452 32.6684 11.3869C33.4194 11.4652 33.9255 11.8969 34.1611 12.6019C34.4031 13.3261 34.2212 13.9831 33.6575 14.4896C32.4069 15.6131 31.1356 16.7139 29.8718 17.8229C28.7401 18.8158 27.6101 19.8102 26.4716 20.795C26.3168 20.9288 26.2862 21.0434 26.3317 21.2427C27.0318 24.2977 27.7194 27.3559 28.4155 30.412C28.5959 31.2042 28.4176 31.8761 27.766 32.3793C27.1517 32.8538 26.3969 32.8584 25.6701 32.4238C22.986 30.8191 20.3011 29.2158 17.6215 27.6036C17.434 27.4908 17.3073 27.4922 17.1197 27.605C14.4299 29.2211 11.7372 30.8333 9.03842 32.4345C7.81022 33.1634 6.42401 32.4897 6.25318 31.1006C6.2272 30.8889 6.2571 30.6814 6.30265 30.4792C6.98704 27.4545 7.67071 24.429 8.37254 21.4082C8.44977 21.0761 8.38321 20.8871 8.12448 20.6626C5.78304 18.6325 3.45905 16.5826 1.12437 14.5447C0.797307 14.2589 0.634663 13.8863 0.480204 13.5016C0.479492 13.2827 0.479492 13.0628 0.479492 12.8428Z" fill="#FEC007" /> </svg>);
    const current = currentPlaying.id === episode.id;
    const watched = watchedEpisodes?.episodes ? (watchedEpisodes?.episodes[ user.loginType === "one-stream-panel" ? String(episode.id) : Number(episode.id)]?.timeline / watchedEpisodes?.episodes[user.loginType === "one-stream-panel" ? String(episode.id) : Number(episode.id)]?.duration) * 100 : null;
    const currentEpisodeProgress = player ? (currentPlayer.player === "videojs" ? player.currentTime() / player.duration() : player.video.time / player.video.duration) * 100 : 0
    return <div onClick={() => handlePlay(episode)} className="episode">
      {/* <a href="#" className="downloadBtn"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12.9128 16.8231C12.9128 16.647 12.9128 16.5365 12.9128 16.4264C12.9128 11.9579 12.9116 7.48924 12.9136 3.02082C12.9142 1.87218 13.7405 1.00809 14.8322 1.00198C15.8809 0.996171 16.7502 1.82364 16.7743 2.87259C16.7909 3.58671 16.779 4.30171 16.7792 5.01612C16.7795 8.82041 16.7792 12.6247 16.7792 16.429C16.7792 16.5394 16.7792 16.6496 16.7792 16.8039C16.8679 16.7435 16.9324 16.7071 16.9879 16.6603C18.3915 15.4835 19.7959 14.3078 21.1956 13.1266C21.7025 12.6988 22.2684 12.4954 22.9279 12.6459C23.7158 12.8258 24.2245 13.3307 24.4355 14.0942C24.6474 14.8615 24.4233 15.5405 23.8152 16.0503C21.2477 18.2037 18.6734 20.3492 16.0924 22.4867C15.3641 23.0898 14.3189 23.0834 13.5847 22.475C10.9968 20.3303 8.41411 18.179 5.83868 16.0192C4.9868 15.3048 4.89088 14.1241 5.58117 13.2941C6.2578 12.48 7.5163 12.3349 8.35046 13.0188C9.79033 14.1988 11.2075 15.4065 12.6346 16.6019C12.7096 16.6647 12.7875 16.7234 12.9128 16.8231Z" fill="#D59FFF" /> <path d="M14.8776 24.1955C17.8678 24.1955 20.8577 24.1897 23.8479 24.1981C25.2392 24.2022 26.1605 25.549 25.6664 26.8285C25.3752 27.5821 24.6774 28.057 23.8313 28.0596C22.2708 28.0643 20.7103 28.0611 19.1498 28.0611C14.7401 28.0611 10.3304 28.062 5.92101 28.0605C4.9735 28.0602 4.22595 27.528 3.97454 26.6855C3.60106 25.4339 4.51863 24.2033 5.84689 24.1978C8.0314 24.1891 10.2162 24.1952 12.401 24.1952C13.2264 24.1955 14.0522 24.1955 14.8776 24.1955Z" fill="#D59FFF" /> </svg></a> */}
      <a href="javascript:void(0)" className="listLink">
        <div className="episode-img" >
          {
            current &&
            <p className='now-playing'>Now Playing</p>
          }
          <svg className='play-icon' width="60" height="60" viewBox="0 0 167 167" fill="none" xmlns="http://www.w3.org/2000/svg"> <g filter="url(#filter0_d_361_4267)"> <rect x="27" y="27" width="113.01" height="113.01" rx="56.505" fill="black" fill-opacity="0.8" /> <rect x="28.5" y="28.5" width="110.01" height="110.01" rx="55.005" stroke="white" stroke-opacity="0.7" stroke-width="3" /> <path d="M68.5371 63.3047C68.854 63.3047 69.1705 63.3047 69.4873 63.3047C70.4095 63.4923 71.277 63.8164 72.0956 64.2865C81.0342 69.419 89.9788 74.541 98.9106 79.6844C99.5548 80.0555 100.174 80.5129 100.702 81.0342C102.145 82.4603 102.206 84.301 100.933 85.8705C100.374 86.559 99.6583 87.0485 98.8993 87.4839C89.9697 92.6055 81.0428 97.7316 72.1046 102.837C71.46 103.205 70.7503 103.499 70.0348 103.695C68.0982 104.226 66.4374 103.344 65.7151 101.477C65.3806 100.612 65.3127 99.707 65.3127 98.7939C65.3109 88.647 65.3109 78.5005 65.3141 68.3535C65.3141 67.9453 65.3281 67.534 65.3756 67.1289C65.5053 66.0187 65.8425 64.9958 66.6743 64.1907C67.1978 63.6835 67.8523 63.4652 68.5371 63.3047Z" fill="white" /> </g> <defs> <filter id="filter0_d_361_4267" x="0.493332" y="0.493332" width="166.023" height="166.023" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix" /> <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" /> <feOffset /> <feGaussianBlur stdDeviation="13.2533" /> <feComposite in2="hardAlpha" operator="out" /> <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" /> <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_361_4267" /> <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_361_4267" result="shape" /> </filter> </defs> </svg>
          {
            episode.info.movie_image ?
              <img src={episode.info.movie_image} /> :
              <img alt="placeholder" src={placeholderImage} />
          }
          {
            String(currentPlaying.id) === String(episode.id) ? <Watched progress={currentEpisodeProgress} /> :
              <Watched progress={watched ? watched : 0} />
          }
        </div>
        <div className="episode-info">
          <span className="h4">{episode.episode_num}. {episode.title}</span>
          <span className="rate">{ratingCount !== 0 && rating()}</span>
          <span className="dur">{secondsToHms(episode.info.duration_secs)}</span>
        </div>
      </a>
      <p className="text">{episode.info.plot?.substring(0, 100)}</p>
    </div>
  }
  return (
    (seasons && episodes && selectedSeason) &&
    <div
      id='episodes-container'
      onMouseMove={onMouseMove}
      style={{
        opacity: show ? 1 : 0,
        visibility: show ? "visible" : "hidden",
        bottom: show ? '0px' : '-1040px',
      }}
      className={`episodes-container`}>
      {/* <h1 className='title'>Episodes</h1> */}
      <select onChange={handleSeason}>
        {
          seasons.map((season, index) => <option key={index} value={index + 1} selected={selectedSeason === (index + 1)}>Season {index + 1}</option>)
        }
      </select>
      <div
        className="episodes">
        <Scrollable>
          {
            episodes[selectedSeason].map((episode, index) => (
              <Episode key={index} episode={episode} />
            ))
          }
        </Scrollable>
      </div>
      <Cancel onClick={() => handleShowEpisode()} className='cancel-icon' sx={{ color: "white" }} />
    </div>
  )
}

export default Episodes