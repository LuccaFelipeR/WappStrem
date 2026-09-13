import React, { useEffect, useRef, useState, useContext } from 'react';
// import { useRouter } from 'next/router';
// import { useRouter as Navigator } from 'next/navigation';
import "./styles.css"
import { endpoint } from '../../../../config/endpoints';
import { Backdrop, CircularProgress } from '@mui/material';
import DashboardHeader from '../../header';
import { AppContext } from '../../../../contexts/app';
import useApi from '../../../../hooks/useApi';
import axios from 'axios';
import { TMBD_API_KEY, castImageUrl, castUrl } from '../../../../config/url';
import ReactPlayer from 'react-player';
import { CloseOutlined } from '@mui/icons-material';
import MoreLikeThis from './more';
import { addToFavs, getParticluarTimeline, getValue, removeFromFavs } from '../../../../firebase/functions';
import Scrollable from '../../../../helpers/scrollable';
import ParentalLock from '../../../../helpers/parentalLock';
import Loading from '../../../../helpers/loading';
import Watched from '../../../../helpers/progress';
import placeholder from "../../../../assets/placeholder.png"
import VideoJsPlayer from '../../../../helpers/player/videojs';
import Player from '../../../../helpers/player';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AES, enc } from 'crypto-js';

const MoviePreview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const router = useNavigate();
  // const navigate = Navigator();
  // const { state } = router.query;
  const state = searchParams.get("state");
  const { user, streamData, alert, parentalVerified, currentPlayer } = useContext(AppContext);
  // const { query } = useRouter();
  const { item } = useParams();
  const reactPlayerRef = useRef(null);
  const { makeRequest } = useApi()
  const [movieCast, setMovieCast] = useState(null);
  const [movie, setMovie] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [ytPlayerReady, setYtPlayerReady] = useState(false);
  const [categoryMovies, setCategoryMovies] = useState(null);
  const [addedToFav, setAddedToFav] = useState(false);
  const [finalAddress, setFinalAddress] = useState(null)
  const [currentTimeline, setCurrentTimeline] = useState(0);
  const [adult, setAdult] = useState(false);
  const [watchedProgress, setWatchedProgress] = useState(0);
  const [addingToFav, setAddingToFav] = useState(false);
  const [currentKeys, setCurrentKeys] = useState(null);

  // useEffect(() => {
  //   setFullscreenAvailable(document.fullscreenEnabled ||
  //     document.mozFullscreenEnabled ||
  //     document.webkitFullscreenEnabled ||
  //     document.msFullscreenEnabled)
  // }, [])

  useEffect(() => {
    if (item && user) {
      setFinalAddress(user.dbAddress);
      checkFav(user.dbAddress)
      setMovie(null);
      setMovieCast(null);
      setCategoryMovies(null);
      getMovie();
      setCurrentKeys(() => {
        if (user.loginType === "one-stream-panel") {
          return {
            info: 'info',
            description: 'plot',
            releaseDate: 'release_date',
            data: 'vod'
          }
        }
        else {
          return {
            info: 'movie_data',
            description: 'description',
            releaseDate: 'releasedate',
            data: 'movie_data'

          }
        }
      })
    }
  }, [item, user]);



  useEffect(() => {
    if (movie && currentKeys && user && streamData.movies) {
      getMovieTimeline()
      getMovieCast();
      getMoviesByCategory();
      if (getParentalPin("currentUser") && !parentalVerified.status) {
        isAdult();
      }
    }
  }, [movie, currentKeys, user, streamData]);

  useEffect(() => {
    if (state === 'play' && movie) {
      handlePlay();
    }
  }, [state, movie]);

  const getParentalPin = (key) => {
    if (!key || typeof window === 'undefined') {
      return ""
    }
    const retrievedUser = Object.values(JSON.parse(localStorage.getItem(key)))[0].parentalPin;
    return retrievedUser;
  }

  const isAdult = async () => {
    const adultArray = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];;
    const parentalPin = getParentalPin('currentUser');

    if (parentalPin) {

      if (streamData.movies.streamCategories) {
        let adultCategoryIds = [];
        adultArray.map(item => {
          const adultCategoryId = streamData.movies.streamCategories.filter(ctg => ctg.category_name.toLowerCase().includes(item))[0]?.category_id;
          if (adultCategoryId) {
            adultCategoryIds.push(adultCategoryId)
          }
        });
        if (adultCategoryIds.filter(id => String(id) === String(movie[currentKeys.info].category_id)).length > 0) {
          setAdult(true);
        } else {

          setAdult(false);
        }
      } else {
        try {
          const response = await makeRequest().get(endpoint.getMovieCategories);
          const categories = response.data.message;
          let adultCategoryIds = [];
          adultArray.map(item => {
            const adultCategoryId = categories.filter(ctg => ctg.category_name.toLowerCase().includes(item))[0]?.category_id;
            if (adultCategoryId) {
              adultCategoryIds.push(adultCategoryId);
            }
          });
          if (adultCategoryIds.filter(id => String(id) === String(movie[currentKeys.info].category_id)).length > 0) {
            setAdult(true);
          } else {
            setAdult(false);
          }
        } catch (error) {
          console.log(error);
          setAdult(false);
        }

      }

    } else {
      setAdult(false)
    }

  }


  const getMovie = async () => {
    try {
      const response = await makeRequest().get(`${endpoint.getMovie}&vod_id=${item}`);
      const movie = response.data;
      const decryptedServerAddress = user?.server && AES.decrypt(user?.server ,"thisisserveraddress").toString(enc.Utf8);
      const decryptedPassword = user?.password && AES.decrypt(user?.password,"thisispassword").toString(enc.Utf8);
                const username = user?.username;
      setMovie(movie);
      if (user.loginType === "one-stream-panel") {
        setStreamUrl(Object.values(movie.vod.links)[0])
      } else {
       const streamUrl = `${decryptedServerAddress}/movie/${username}/${decryptedPassword}/${item}.${response.data.movie_data.container_extension}`
        setStreamUrl(streamUrl);

      }
    } catch (error) {
      console.log(error)
    }
  }

  const getMovieTimeline = async () => {
    const streamId = user.loginType === "one-stream-panel" ? movie.vod.stream_id : movie.movie_data.stream_id
    try {
      const response = await getParticluarTimeline(streamId, 'Movie', finalAddress);
      if (response.val()) {
        const { timeline, duration } = response.val();
        const watched = (timeline / duration) * 100;
        setWatchedProgress(watched);
        setCurrentTimeline(watched < 100 ? response.val() ? response.val().timeline : null : 0);

      } else {
        setCurrentTimeline(null);
        setWatchedProgress(0);
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getMoviesByCategory = async () => {
    if (streamData.movies.streams) {
      const movies = streamData.movies.streams;
      const categoryWisedMovies = movies.filter(item =>
        item.category_id === movie[currentKeys.info]?.category_id ||
        item.categories?.filter(id => String(id) === String(movie.info.categories[0]))
      ).sort((a, b) => {
        return new Date(a.added) - new Date(b.added)
      }).reverse().slice(0, 15);
      setCategoryMovies(categoryWisedMovies);
    } else {
      try {
        const category_id = user.loginType === "one-stream-panel" ? movie.info.categories[0] : movie.movie_data.category_id
        const response = await makeRequest().get(endpoint.getMoviesByCategory + '?category_id=' + category_id);
        setCategoryMovies(response.data.message);
      } catch (error) {
        console.log(error);
      }
    }
  }

  const getMovieCast = async () => {
    try {
      const response = await axios.get(castUrl + movie.info.tmdb_id + '/credits?api_key=' + TMBD_API_KEY);
      setMovieCast(response.data.cast)
    } catch (error) {
      console.log(error);
      setMovieCast(null)
    }
  }

  const secondsToHms = (d) => {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? "min" : " min") : "";
    return hDisplay + " " + mDisplay;
  }

  const handlePlay = () => {
    getMovieTimeline();
    setPlayerOpen(true);
  };

  const handleTrailer = () => {
    setShowTrailer(true);
    // reactPlayerRef.current.seekTo(0, "seconds")
  }

  const handleFavourites = async () => {
    setAddingToFav(true);
    if (addedToFav) {
      try {
        await removeFromFavs(item, "Movie", finalAddress);
        alert.toggle({
          title: "Removed from favourites",
          show: true,
          type: "success"
        })
      } catch (error) {
        console.log(error);
        alert.toggle({
          title: "Something went wrong",
          show: true,
          type: "error"
        })
      }

      checkFav(finalAddress)
      setAddingToFav(false);
    } else {
      try {
        await addToFavs(item, "Movie", finalAddress);
        alert.toggle({
          title: "Added to favourites",
          show: true,
          type: "success"
        })
      } catch (error) {
        console.log(error);
        alert.toggle({
          title: "Something went wrong",
          show: true,
          type: "error"
        })
      }
      checkFav(finalAddress);
      setAddingToFav(false);
    }

  }


  const checkFav = async (address) => {
    try {
      const response = await getValue(item, "Movie", address);
      const added = await response.val();
      setAddedToFav(added)
    } catch (error) {
      console.log(error);
    }
  }

  const handleClose = () => {
    setPlayerOpen(false);
    getMovieTimeline()
    setWatchedProgress(0)
    if (state === "play") {
      router('/dashboard?view=movies')
    }
  }

  const handleCloseTrailer = () => {
    reactPlayerRef.current.seekTo(0)
    setShowTrailer(false)
  };

  return (
    movie ?
      <div>
        <DashboardHeader />
        <section className="mainBanner previewMainBanner">
          <div className="item">
            <div className="thumb">
              {/* {
                <a onClick={handlePlay} href="javascript:void(0)" className="playBtn"><svg width="167" height="167" viewBox="0 0 167 167" fill="none" xmlns="http://www.w3.org/2000/svg"> <g filter="url(#filter0_d_361_4267)"> <rect x="27" y="27" width="113.01" height="113.01" rx="56.505" fill="black" fill-opacity="0.8" /> <rect x="28.5" y="28.5" width="110.01" height="110.01" rx="55.005" stroke="white" stroke-opacity="0.7" stroke-width="3" /> <path d="M68.5371 63.3047C68.854 63.3047 69.1705 63.3047 69.4873 63.3047C70.4095 63.4923 71.277 63.8164 72.0956 64.2865C81.0342 69.419 89.9788 74.541 98.9106 79.6844C99.5548 80.0555 100.174 80.5129 100.702 81.0342C102.145 82.4603 102.206 84.301 100.933 85.8705C100.374 86.559 99.6583 87.0485 98.8993 87.4839C89.9697 92.6055 81.0428 97.7316 72.1046 102.837C71.46 103.205 70.7503 103.499 70.0348 103.695C68.0982 104.226 66.4374 103.344 65.7151 101.477C65.3806 100.612 65.3127 99.707 65.3127 98.7939C65.3109 88.647 65.3109 78.5005 65.3141 68.3535C65.3141 67.9453 65.3281 67.534 65.3756 67.1289C65.5053 66.0187 65.8425 64.9958 66.6743 64.1907C67.1978 63.6835 67.8523 63.4652 68.5371 63.3047Z" fill="white" /> </g> <defs> <filter id="filter0_d_361_4267" x="0.493332" y="0.493332" width="166.023" height="166.023" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"> <feFlood flood-opacity="0" result="BackgroundImageFix" /> <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" /> <feOffset /> <feGaussianBlur stdDeviation="13.2533" /> <feComposite in2="hardAlpha" operator="out" /> <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" /> <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_361_4267" /> <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_361_4267" result="shape" /> </filter> </defs> </svg></a>
              } */}
              <span className="effectGrad"></span><img src={movie?.info?.backdrop_path ? movie?.info?.backdrop_path[0] : "/placeholder.jpg"} /></div>
            <div className="info">
              <span className="h2">{movie[currentKeys.data]?.name}</span>
              <div className="playInfo">
                {
                Number(movie?.info?.rating) > 0 &&
                <span className="rating"><svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0.163086 8.51797C0.276456 8.14688 0.474801 7.84313 0.854064 7.70179C1.18901 7.57702 1.54762 7.59745 1.89613 7.56325C2.86719 7.46795 3.83913 7.38341 4.81084 7.29542C5.45879 7.23669 6.10632 7.17366 6.75492 7.12526C6.94982 7.11063 7.06577 7.05986 7.15074 6.85764C7.86883 5.14762 8.60369 3.44448 9.3306 1.73833C9.64984 0.988843 10.4527 0.745322 11.0518 1.22139C11.2286 1.36187 11.3328 1.55139 11.4201 1.75554C12.156 3.47976 12.8958 5.20226 13.6286 6.92777C13.6793 7.0476 13.7389 7.1031 13.8691 7.11407C14.9671 7.207 16.0648 7.30338 17.1622 7.40298C17.9818 7.47742 18.8014 7.55228 19.62 7.6379C20.0739 7.68523 20.3798 7.94617 20.5222 8.37233C20.6685 8.81011 20.5586 9.20723 20.2178 9.51335C19.4619 10.1925 18.6934 10.8579 17.9295 11.5282C17.2454 12.1284 16.5624 12.7295 15.8742 13.3247C15.7807 13.4056 15.7622 13.4749 15.7897 13.5953C16.2128 15.442 16.6285 17.2905 17.0492 19.1378C17.1583 19.6167 17.0505 20.0228 16.6566 20.327C16.2853 20.6138 15.8291 20.6165 15.3898 20.3539C13.7673 19.3839 12.1444 18.4148 10.5247 17.4402C10.4114 17.372 10.3348 17.3729 10.2214 17.4411C8.59552 18.418 6.96789 19.3925 5.3366 20.3603C4.59421 20.8009 3.7563 20.3937 3.65304 19.5541C3.63734 19.4261 3.65541 19.3006 3.68295 19.1784C4.09663 17.3501 4.50988 15.5213 4.93411 13.6954C4.98079 13.4947 4.94056 13.3804 4.78416 13.2447C3.36886 12.0176 1.9641 10.7785 0.552891 9.54669C0.355192 9.37395 0.25688 9.14871 0.163516 8.91617C0.163086 8.78386 0.163086 8.65092 0.163086 8.51797Z" fill="#FEC007" /> </svg> {Number(movie?.info?.rating).toFixed(1)}</span>
              }
                
                <span className="duration">{secondsToHms(movie?.info?.duration_secs)}</span>
                {
                  movie?.info[currentKeys.releaseDate] ?
                    <span className="date">{movie?.info[currentKeys.releaseDate]}</span> :
                    null
                }
                <strong>HD</strong>
              </div>
              <p className="text"> { movie?.info?.genre && movie?.info?.genre.length > 0 && <><b>Genre:</b> {movie?.info?.genre}</> }  <br /> { movie?.info?.director && movie?.info?.director.length > 0 &&  <><b>Directed By:</b> {movie?.info?.director}</>}</p>
              <p className="text">{movie?.info[currentKeys.description ? currentKeys.description : 'plot']}</p>
              <div className="btnGroup">
                <button onClick={handlePlay} className="btn btn-primary playBtn"><svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 0.120605V29.8574L27.928 14.989L0 0.120605Z" fill="white" /> </svg>
                  {
                    currentTimeline ? "Resume" : "Play"
                  }
                  {/* <div style={{
                    width: `${watchedProgress}%`
                  }} className='watched-timeline'>
                  </div> */}
                  {
                    watchedProgress > 0 &&
                    <Watched progress={watchedProgress} />
                  }
                </button>
                {
                  addingToFav ?
                    <div className='fav-loader-container'>
                      <CircularProgress className='fav-loader' />
                    </div> :
                    <button onClick={handleFavourites} className="btn btn-primary">
                      <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill={addedToFav ? "#FF0000" : "white"} /> </svg> My Fav

                    </button>
                }
                {
                  ytPlayerReady &&
                  <button onClick={handleTrailer} className="btn btn-primary">
                    Watch Trailer
                  </button>
                }
                {/* <button className="btn btn-primary"><svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M11.0936 13.855C11.0936 13.7095 11.0936 13.6183 11.0936 13.5274C11.0936 9.8376 11.0926 6.1476 11.0943 2.45784C11.0948 1.50936 11.7771 0.795837 12.6786 0.790797C13.5445 0.785997 14.2623 1.46928 14.2822 2.33544C14.2959 2.92512 14.2861 3.51552 14.2863 4.10544C14.2866 7.2468 14.2863 10.3882 14.2863 13.5295C14.2863 13.6207 14.2863 13.7117 14.2863 13.8391C14.3595 13.7892 14.4128 13.7592 14.4586 13.7206C15.6176 12.7488 16.7773 11.778 17.9331 10.8026C18.3517 10.4494 18.819 10.2814 19.3635 10.4057C20.0142 10.5542 20.4342 10.9711 20.6084 11.6016C20.7834 12.2352 20.5983 12.7958 20.0962 13.2168C17.9761 14.995 15.8504 16.7666 13.7192 18.5316C13.1178 19.0296 12.2547 19.0243 11.6485 18.522C9.51151 16.751 7.37887 14.9746 5.25223 13.1911C4.54879 12.6012 4.46959 11.6263 5.03959 10.9409C5.59831 10.2686 6.63751 10.1489 7.32631 10.7136C8.51527 11.688 9.68551 12.6852 10.8639 13.6723C10.9258 13.7242 10.9902 13.7726 11.0936 13.855Z" fill="white" /> <path d="M12.715 19.9429C15.1841 19.9429 17.653 19.9381 20.1221 19.945C21.271 19.9484 22.0318 21.0606 21.6238 22.117C21.3833 22.7394 20.8071 23.1315 20.1084 23.1337C18.8199 23.1375 17.5313 23.1349 16.2428 23.1349C12.6015 23.1349 8.96019 23.1356 5.31915 23.1344C4.53675 23.1342 3.91947 22.6947 3.71187 21.999C3.40347 20.9655 4.16115 19.9494 5.25795 19.9448C7.06179 19.9376 8.86587 19.9426 10.67 19.9426C11.3516 19.9429 12.0334 19.9429 12.715 19.9429Z" fill="white" /> </svg> Download</button> */}
              </div>
            </div>
          </div>
        </section >
        {(movie.info.tmdb_id && String(movie.info.tmdb_id).length > 0) &&
          <section className="castCrew castSlider">
            {(movieCast && movieCast.length > 0) && <>
              <span className="h3">Cast & Crew</span>
              <Scrollable>
                {
                  movieCast?.map((cast, index) => (
                    <div key={index} className="item">
                      <div className="thumb">
                        {
                          cast.profile_path ?
                            <img src={cast.profile_path ? castImageUrl + cast.profile_path : "/placeholder.png"} /> :
                            <img alt="placeholder" src={placeholder} />
                        }
                      </div>
                      <span className="h4">{cast.name}</span>
                    </div>
                  ))
                }
              </Scrollable></>}

          </section>
        }
        <br />
        {(categoryMovies && categoryMovies.length > 0) &&
          <MoreLikeThis movies={categoryMovies} />
        }
        {
          (movie.info.youtube_trailer && movie.info.youtube_trailer.length) &&
          <div>
            {
              showTrailer &&
              <CloseOutlined onClick={handleCloseTrailer} className='close-icon' />
            }
            {
              <ReactPlayer
                onError={() => setShowTrailer(false)}
                url={`https://www.youtube.com/watch?v=${movie.info.youtube_trailer}`}
                width={"100%"}
                height={"100%"}
                onReady={() => setYtPlayerReady(true)}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  zIndex: 9999,
                  visibility: showTrailer ? "visible" : "hidden",
                  opacity: showTrailer ? 1 : 0,
                  transition: ".4s"
                }}
                playing={showTrailer}
                config={{
                  youtube: {
                    playerVars: {
                      fullscreen: true,
                    }
                  }
                }}
                ref={reactPlayerRef}
              />
            }

          </div>
        }

        <br />
        {
          playerOpen ?
            currentPlayer.player === 'videojs' ?
            <VideoJsPlayer
              type={"movies"}
              timeline={currentTimeline}
              id={item}
              close={handleClose}
              src={streamUrl}
              loginType={user.loginType}
              info={movie}
            /> :
            <Player
              type={"movies"}
              timeline={currentTimeline}
              id={item}
              close={handleClose}
              src={streamUrl}
              loginType={user.loginType}
              info={movie} /> : null
        }
        <ParentalLock
          action={"verify"}
          close={() => setAdult(false)}
          open={adult}
          completed={() => setAdult(false)}
          noEscape={true}
        />
      </div >
      :
      <Loading />
  )
}

export default MoviePreview