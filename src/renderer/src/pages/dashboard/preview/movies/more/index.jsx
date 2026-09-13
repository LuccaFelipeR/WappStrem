import "./styles.css"
// import "../../../styles.css"
// import Scrollable from "../../../../../helpers/scrollable"
import placeholderImage from "../../../../../assets/placeholder.png"
import { Swiper, SwiperSlide } from "swiper/react"
import { useState, useEffect } from "react";
import 'swiper/css';
import { Link } from "react-router-dom";


const MoreLikeThis = ({ movies }) => {

    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        setWindowWidth(window.innerWidth);
    }, [])

    const options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    };

    // const formattedDate = (timestamp) => new Intl.DateTimeFormat('en-US', options).format(timestamp);


    return <div className="more-like-this-container">
        <span class="h3">More Like This</span   >
        <Swiper
            style={{
                padding: 10
            }}
            slidesPerView={windowWidth ? Math.min((windowWidth - 20) / 205) : 7}
        >

            {/* <Scrollable style={{ paddingLeft: 10 }}> */}
            {
                movies?.map((movie, index) => {
                   return <SwiperSlide key={index}>
                        <Link to={`/dashboard/preview/movies/${movie.stream_id}`}>
                            <div key={index} className="item">
                                <div className="caption">
                                    <span className="control">
                                        {
                                            (Number(movie.rating).toFixed(1) !== 'NaN' && Number(movie.rating) !== 0) ?
                                                <span className="count">{Number(movie.rating).toFixed(1)}</span> :
                                                <span></span>
                                        }
                                    </span>
                                    <span className="info">
                                        <text></text>
                                        {/* <text>{formattedDate(movie.added)}</text> */}
                                    </span>
                                    <span className="h2">{movie.name}</span>
                                </div>
                                <div className="thumb">
                                    {
                                        (movie.stream_icon && movie.stream_icon.length > 0) ?
                                            <img src={
                                                movie.stream_icon
                                            } /> :
                                            <img alt="placeholder" layout="fill" src={placeholderImage} />
                                    }
                                </div>
                            </div>
                        </Link>
                    </SwiperSlide>
                }
                )
            }
            {/* </Scrollable> */}
        </Swiper>

    </div>
}

export default MoreLikeThis;