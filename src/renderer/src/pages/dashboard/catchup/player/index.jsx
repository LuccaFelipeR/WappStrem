import React, { useState, useEffect, useRef } from 'react'
import "./styles.css"
// import { useRouter } from 'next/router';
// import Image from 'next/image';
import backBtn from "../../../../assets/backBtn.svg"
import nextEpisode from "../../../../assets/nextEpisode.svg"
import episodes from "../../../../assets/episodes.svg"
import aspectRatio from "../../../../assets/aspectRatio.svg"
import playBtn from "../../../../assets/playBtn.svg"
import pauseBtn from "../../../../assets/pauseBtn.svg"

const CatchUpPlayer = ({
    src,
    onPlayerReady,
    currentStreams,
    onPreviousChannel,
    onNextChannel,
    currentStream,
    onclose,
    opened,
    onfullscreen,
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
            });
            player.on('pause', () => {
                setPlayActive(false);
            });
            player.on('resume', () => {
                setPlayActive(true);
            });

           
            return () => {
                if(isIos()){
                    player.unload();
                }else{
                    player?.engine.unload();
                }
            }
        }
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
        if (src && player) {
            player.load({
                sources: [
                    {
                        type: "application/x-mpegURL",
                        src :  src,
                    },
                ]
            })
        }
    }, [src])



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
        if (currentStreams.length === 1) {
            setPreviousExists(false);
            setNextExists(false);
            setCurrentStreamIndex(0);
        } else {
            currentStreams.map((stream, index) => {
                if (String(stream.stream_id) === String(currentStream)) {
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
    }, [currentStreams, currentStream]);

    useEffect(() => {
        if (playerRef.current) {
            const fpUi = playerRef.current.childNodes[1].childNodes[4].childNodes;
            fpUi.forEach(node => {
                if (node.className === "fp-controls") {
                    node.style.bottom = (fullscreen || fullwidth) ? '90px' : '40px';
                    node.style.opacity = controlsActive ? 1 : 0;
                    node.style.visibility = controlsActive ? "visible" : "hidden";
                }
            })
        }
    }, [controlsActive, fullscreen, fullwidth]);


    const handleMouseOver = () => {
        if (controlsTimer) {
            clearTimeout(controlsTimer)
        }
        setControlsActive(true);
        const timer = setTimeout(() => {
            setControlsActive(false);
        }, 5000);
        setControlsTimer(timer);
    }

    const handleBack = () => {
        if (fullwidth) {
            setFullwidth(false)
        }
        if (fullscreen) {
            document.exitFullscreen();
        }
        onclose();

    }

    const handleChannelList = () => {
        setFullwidth(false);
        if (fullscreen) {
            document.exitFullscreen();
        }
        onclose();
    }

    const handlePlayPause = () => {
        if (playActive) {
            player.pause()
        } else {
            player.play();
        }
    }

    const controlsStyles = {
        transition: ".3s",
        opacity: controlsActive ? 1 : 0,
        visibility: controlsActive ? "visible" : "hidden"
    }

    return (
        <div
            id='live-playerrr'
            className={`live-player${fullwidth ? '-fullscreen' : ''}`}
            onMouseMove={handleMouseOver}
        >
            <img alt="placeholder"
                style={{
                    display: !(fullwidth || fullscreen) && "none",
                    ...controlsStyles
                }}
                onClick={handleBack} className='back-btn' src={backBtn} />

            <div id="player-wrapperr" ref={playerRef}>
                {
                    <img alt="placeholder"
                        style={{
                            display: (error || !playerReady) && "none",
                            ...controlsStyles
                        }}
                        onClick={handlePlayPause} className='play-pause-btn' src={playActive ? pauseBtn : playBtn} />
                }
                <h3 style={controlsStyles}
                    className='channel-name' >{currentStreams && currentStreams[currentStreamIndex]?.name}</h3>
                {
                    <div style={controlsStyles} className={`live-bottom-controls-catchup${(fullscreen || fullwidth) ? "-fullscreen" : ""}`}>
                        {
                            previousExists &&
                            <div onClick={() => onPreviousChannel(currentStreamIndex)} className="option">
                                <img alt="placeholder" src={nextEpisode} />
                                <p>Previous Channel</p>
                            </div>
                        }
                        {
                            (fullscreen || fullwidth) &&
                            <div onClick={handleChannelList} className="option">
                                <img alt="placeholder" src={episodes} />
                                <p>Channels List</p>
                            </div>
                        }
                        {
                            fullscreenAvailable &&
                            <div onClick={handleAspectRatio} className="option">
                                <img alt="placeholder" src={aspectRatio} />
                                <p>Aspect Ratio</p>
                            </div>
                        }
                        {
                            nextExists &&
                            <div onClick={async () => {
                                player.engine.unload();
                                setTimeout(() => {
                                    onNextChannel(currentStreamIndex)
                                }, 100);
                            }} className="option">
                                <img alt="placeholder" src={nextEpisode} />
                                <p>Next Channel</p>
                            </div>
                        }
                    </div>
                }
                {
                    error &&
                    <div className='error-modal'>

                        <p>There is some error playing the video</p>;
                        <button onClick={() => restart(currentStreamIndex)}>Try again</button>
                    </div>
                }
            </div>

        </div>
    )
}

export default CatchUpPlayer