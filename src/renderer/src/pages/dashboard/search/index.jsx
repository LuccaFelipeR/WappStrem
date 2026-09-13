import { Tab, Tabs } from "@mui/material";
// import { AutoSizer, List } from "react-virtualized";
import { useState, useEffect, useContext } from "react"
import { formattedDate } from "../list";
import "./styles.css"
// import { useRouter as Navigator } from 'next/navigation';
import ParentalLock from "../../../helpers/parentalLock";
import { AppContext } from "../../../contexts/app";
import { getFavourites } from "../../../firebase/functions";
// import Link from "next/link";
// import Image from "next/image";
import placeholderImage from "../../../assets/placeholder.png"
import noContentFound from "../../../assets/noContentFound.svg"
import { Link, useNavigate } from "react-router-dom";
import { getParentalPin } from "../../../helpers/local";
import { AutoSizer, List } from "react-virtualized";

const SearchedItems = () => {
    const navigate = useNavigate();
    const { user, streamData } = useContext(AppContext);

    const [movies, setMovies] = useState([]);
    const [series, setSeries] = useState([]);
    const [liveStreams, setLiveStreams] = useState([]);

    //favourites

    const [moviesFavs, setMoviesFavs] = useState([]);
    const [seriesFavs, setSeriesFavs] = useState([]);
    const [liveStreamsFavs, setLiveStreamsFavs] = useState([]);

    const [noData, setNoData] = useState(false);
    const [currentTab, setCurrentTab] = useState("Movies");
    const [showParentalLock, setShowParentalLock] = useState(false);
    const [currentSelected, setCurrentSelected] = useState(movies);
    const [currentItem, setCurrentItem] = useState("");
    const [errorIndex, setErrorIndex] = useState(false);
    const currentType = currentTab === "Movies" ? "movies" : "series";

    const handleTab = (newtab) => {
        setCurrentTab(newtab);
        if (newtab === "Movies") {
            setCurrentSelected(movies)
        }
        else if (newtab === "Series") {
            setCurrentSelected(series)
        } else {
            setCurrentSelected(liveStreams);
        }
    };

    useEffect(() => {
        handleTab(currentTab)
    }, [movies, series, liveStreams]);

    useEffect(() => {
        if (user) {
            getFavs(setMoviesFavs, "Movie");
            getFavs(setSeriesFavs, "Series");
            getFavs(setLiveStreamsFavs, "LiveTv");
        }
    }, [user]);

    const getFavs = async (setFn, type) => {
        try {
            const response = await getFavourites(type, user.dbAddress)
            if (response.val()) {
                const data = Object.keys(response.val());
                setFn(data)
            } else {
                setFn([]);
            }
        } catch (error) {
            console.log(error)
        }
    }

    const ITEMS_COUNT = currentSelected.length;
    const parentalPin = getParentalPin("currentUser");


    const isAdult = (data) => {
        const adultArray = ["adult", "xxx", "porn", "sex", "adults", "ADULTS", "+18", "18+", "18"];
        const { streamCategories: moviesCategories } = streamData.movies;
        const { streamCategories: seriesCategories } = streamData.series;
        const { streamCategories: liveTvCategories } = streamData.liveTv;
        const combinedCategories = currentTab === 'LiveTv' ? liveTvCategories :
            currentTab === 'Movies' ? moviesCategories :
                currentTab === "Series" ? seriesCategories :
                    []
        const { category_id, categories, category_ids } = data;
        let adultCategoryIds = [];
        adultArray.map(item => {
            const adultCategoryId = combinedCategories.filter(ctg => ctg.category_name.toLowerCase().includes(item.toLowerCase()))[0]?.category_id;
            if (adultCategoryId) {
                adultCategoryIds.push(adultCategoryId)
            }
        });
        const match = category_id ? category_id : categories ? categories[0] : category_ids ? category_ids[0] : null
        if (match && adultCategoryIds.filter(id => String(id) === String(match)).length > 0) {
            return true
        }
        return false
    }


    const handleItem = (item) => {
        const id = (currentTab === "Movies" || currentTab === "LiveTv") ? 'stream_id' : 'series_id';
        setCurrentItem(item);
        if (currentTab === "LiveTv") {
            if (isAdult(item) && parentalPin) {
                setShowParentalLock(true);
            } else {
                navigate(`/dashboard/live?view=${item[id]}`)
            }

        } else {
            if (isAdult(item)) {
                setShowParentalLock(true)
            } else {
                navigate(`/dashboard/preview/${currentType}/${item[id]}`)
            }
        }
    }
    const handlePinVerified = () => {
        const id = (currentTab === "Movies" || currentTab === "LiveTv") ? 'stream_id' : 'series_id';
        if (currentTab === "LiveTv") {
            navigate(`/dashboard/live?view=${currentItem[id]}`)
        } else {
            navigate(`/dashboard/preview/${currentType}/${currentItem[id]}`);
        }
        setShowParentalLock(false);
    };

    const handleSearch = (e) => {
        const { value } = e.target;
        const searchedMovies = streamData.movies.streams.filter(movie => movie?.name?.toLowerCase().includes(value.toLowerCase()));
        const searchedSeries = streamData.series.streams.filter(serie => serie.name.toLowerCase().includes(value.toLowerCase()));
        const searchedLiveStreams = streamData.liveTv.streams.filter(stream => stream.name.toLowerCase().includes(value.toLowerCase()));
        setMovies(searchedMovies);
        setSeries(searchedSeries);
        setLiveStreams(searchedLiveStreams);
        if (searchedMovies.length === 0 &&
            searchedSeries.length === 0 &&
            searchedLiveStreams.length === 0
        ) {
            setNoData(true);
        } else {
            setNoData(false);
          if ( searchedMovies.length > 0 && searchedSeries.length > 0 && searchedLiveStreams.length > 0 ){
            setCurrentTab("Movies")
          }
          else if ( searchedMovies.length === 0 && searchedSeries.length > 0 && searchedLiveStreams.length > 0 ){
            setCurrentTab("Series")
          }
          else if (searchedMovies.length === 0 && searchedSeries.length === 0 && searchedLiveStreams.length > 0) {
                setCurrentTab("LiveTv")
          }
          else if ( searchedMovies.length === 0 && searchedSeries.length > 0 && searchedLiveStreams.length === 0 ){
            setCurrentTab("Series")
      }
        }
        if (value === "") {
            setMovies([]);
            setSeries([]);
            setLiveStreams([]);
        }
    };

    const currentTabStyle = {
        borderBottom: "1px solid var(--md-ref-palette-primary35)",
        borderBottomWidth: "4px"
    }

    return <div className="searched-items">
        <div id="searched-items-container" className="searched-items-container" style={{
            paddingTop: user?.loginType === 'm3u' ? 0 : '80px'

        }}>
            <div className="search-input-container">
                <input onChange={handleSearch}
                    className='search-input' type='text' placeholder='Search by Channel, Movies, and Series Name' />
            </div>
            <br />
            {
                !noData ?
                    <>
                        {/* <Tabs className="tabs-container" value={currentTab} onChange={handleTab} aria-label="disabled tabs example">
                            {movies.length > 0 && <Tab className="tab" value={"Movies"} label="Movies" />}
                            {series.length > 0 && <Tab className="tab" value={"Series"} label="Series" />}
                            {liveStreams.length > 0 && <Tab className="tab" value={"LiveTv"} label="Live Tv" />}

                        </Tabs> */}
                        <div className="tabs-container">
                            { movies.length > 0 && <div onClick={() => handleTab("Movies")} style={ currentTab === "Movies" ? currentTabStyle: {} } className="tab">
                                <p className="tab-title">Movies</p>
                                <p className="tab-count">{movies.length}</p>
                            </div>}
                            { series.length > 0 && <div onClick={() => handleTab("Series")} style={ currentTab === "Series" ? currentTabStyle: {} } className="tab">
                                <p className="tab-title">Series</p>
                                <p className="tab-count">{series.length}</p>
                            </div>}
                            { liveStreams.length > 0 && <div onClick={() => handleTab("LiveTv")} style={ currentTab === "LiveTv" ? currentTabStyle: {} } className="tab">
                                <p className="tab-title">Live Tv</p>
                                <p className="tab-count">{liveStreams.length}</p>
                            </div>}
                        </div>
                        <br />
                        <AutoSizer >
                            {({ height, width }) => {
                                const dividendWidth = width < 500 ? width / 2 : 180;
                                const itemsPerRow = Math.floor(width / dividendWidth);
                                const rowCount = Math.ceil(ITEMS_COUNT / itemsPerRow);

                                return (
                                    <section className="category listSlider">
                                        <List
                                            width={width}
                                            height={height}
                                            rowCount={rowCount}
                                            rowHeight={270}
                                            rowRenderer={
                                                ({ index, key, style }) => {
                                                    const items = [];
                                                    const fromIndex = index * itemsPerRow;
                                                    const toIndex = Math.min(fromIndex + itemsPerRow, ITEMS_COUNT);

                                                    for (let i = fromIndex; i < toIndex; i++) {
                                                        const id = currentTab === "Movies" || currentTab === "LiveTv" ? "stream_id" : "series_id";
                                                        const favArr = currentTab === "Movies" ? moviesFavs : currentTab === "LiveTv" ? liveStreamsFavs : seriesFavs
                                                        const isFavourite = favArr.filter(movieId => String(movieId) === String(currentSelected[i][id])).length > 0;
                                                        items.push(
                                                            currentTab === "LiveTv" ?
                                                                <div
                                                                    onClick={() => handleItem(currentSelected[i])}
                                                                    key={i} style={{ marginTop: 10, marginLeft: 10, padding: 5, height: 270, width: dividendWidth }} className="item">
                                                                    <div className="caption">
                                                                        <span className="control">
                                                                            <span style={{ opacity: 0 }} className="count"></span>
                                                                            {
                                                                                isFavourite &&
                                                                                <Link href="#"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>

                                                                            }
                                                                        </span>
                                                                        <span className="info">
                                                                            <text> </text>
                                                                            {/* <text>{currentSelected[i].added && formattedDate(currentSelected[i].added)}</text> */}
                                                                        </span>
                                                                        <span className="h2">{currentSelected[i].name}</span>
                                                                    </div>
                                                                    <div className="thumb">
                                                                        {
                                                                            errorIndex === index ?
                                                                                <img alt="placeholder" layout="fill" src={placeholderImage} /> :
                                                                                currentSelected[i]["stream_icon"] ?
                                                                                    <img className="search-item-img"
                                                                                        style={{
                                                                                            filter: (isAdult(currentSelected[i]) && parentalPin) && 'blur(20px)'
                                                                                        }} loading="lazy"
                                                                                        onLoad={e => e.target.style.opacity = 1}
                                                                                        onError={e => setErrorIndex(index)}
                                                                                        src={
                                                                                            currentSelected[i]["stream_icon"]} /> :
                                                                                    <img alt="placeholder" layout="fill" src={placeholderImage} />
                                                                        }
                                                                        {(isAdult(currentSelected[i]) && parentalPin) &&
                                                                            <svg style={{ zIndex: 99, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="32" height="38" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="black" />
                                                                            </svg>}
                                                                    </div>
                                                                </div>
                                                                :
                                                                <div
                                                                    onClick={() => handleItem(currentSelected[i])}
                                                                    key={i} style={{ marginTop: 10, marginLeft: 10, padding: 5, height: 270, width: dividendWidth }} className="item">
                                                                    <div className="caption">
                                                                        <span className="control">
                                                                            {
                                                                                (Number(currentSelected[i].rating).toFixed(1) !== "NaN" && Number(currentSelected[i].rating) !== 0) ?
                                                                                    <span className="count">{Number(currentSelected[i].rating).toFixed(1)}</span> :
                                                                                    <span></span>
                                                                            }
                                                                            {
                                                                                isFavourite &&
                                                                                <Link href="#"><svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M29.2239 7.73189C29.2239 8.12625 29.2239 8.52061 29.2239 8.91467C29.2091 8.99632 29.1875 9.07738 29.181 9.15933C29.0718 10.5385 28.6337 11.8136 27.9606 13.0141C27.113 14.5265 25.9933 15.827 24.7685 17.0364C21.7994 19.9679 18.5333 22.5639 15.3951 25.3043C15.0229 25.6294 14.5771 25.6093 14.1904 25.2874C13.8659 25.0173 13.5469 24.7404 13.2289 24.4623C10.706 22.2574 8.16057 20.0782 5.67077 17.8369C4.12678 16.4471 2.71503 14.9182 1.69378 13.0851C-0.0217981 10.006 -0.113805 6.88017 1.61036 3.78242C2.56563 2.06565 4.04069 0.913648 5.94354 0.375217C7.9733 -0.19901 9.91905 0.00807828 11.7287 1.14352C12.8804 1.86626 13.7579 2.85732 14.4765 3.99927C14.5827 4.1679 14.6862 4.33801 14.7629 4.46167C15.3081 3.75845 15.7856 3.01796 16.3841 2.39344C18.4931 0.19357 21.056 -0.47858 23.9434 0.472844C26.661 1.36835 28.2366 3.37771 28.9393 6.10329C29.0762 6.63521 29.131 7.18843 29.2239 7.73189Z" fill="#FF0000" /> </svg></Link>

                                                                            }
                                                                        </span>
                                                                        <span className="info">
                                                                            <text>{currentSelected[i].category_name}</text>
                                                                            {/* <text>{currentSelected[i].added && formattedDate(currentSelected[i].added)}</text> */}
                                                                        </span>
                                                                        <span className="h2">{currentSelected[i].name}</span>
                                                                    </div>
                                                                    {

                                                                        <div className="thumb">
                                                                            {
                                                                                errorIndex === index ?
                                                                                    <img alt="placeholder" layout="fill" src={placeholderImage} /> :
                                                                                    currentSelected[i][currentTab === "Movies" ? "stream_icon" : "cover"] ?
                                                                                        <img style={{
                                                                                            filter: (isAdult(currentSelected[i]) && parentalPin) && 'blur(20px)'
                                                                                        }} className="search-item-img"
                                                                                            loading="lazy"
                                                                                            onError={() => setErrorIndex(index)}
                                                                                            onLoad={e => e.target.style.opacity = 1}
                                                                                            src={
                                                                                                currentSelected[i][currentTab === "Movies" ? "stream_icon" : "cover"]
                                                                                            } /> :
                                                                                        <img alt="placeholder" layout="fill" src={placeholderImage} />
                                                                            }
                                                                            {(isAdult(currentSelected[i]) && parentalPin) &&
                                                                                <svg style={{ zIndex: 99, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="32" height="38" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                    <path d="M9.35342 0.978516C9.71046 0.978516 10.0675 0.978516 10.4246 0.978516C10.6069 1.0108 10.7891 1.04529 10.972 1.07454C13.6371 1.50415 15.8459 3.8255 16.0656 6.51604C16.1583 7.65313 16.1075 8.80208 16.1216 9.94578C16.1229 10.0653 16.1218 10.1847 16.1218 10.3277C16.3536 10.3277 16.5625 10.3274 16.7714 10.3277C18.2385 10.3296 19.2373 11.3213 19.2379 12.7826C19.2392 16.337 19.239 19.8918 19.2379 23.4462C19.2373 24.9108 18.2409 25.908 16.7791 25.9094C15.3184 25.9108 13.8576 25.9097 12.3969 25.9097C9.24001 25.9097 6.08316 25.9124 2.92631 25.9083C1.60326 25.9066 0.549224 24.9067 0.545085 23.6167C0.533772 19.9486 0.535152 16.2805 0.545085 12.6123C0.54812 11.4981 1.37617 10.547 2.47545 10.3743C2.8554 10.3147 3.24694 10.3277 3.65641 10.3061C3.65641 10.2176 3.65641 10.1301 3.65641 10.0429C3.65696 9.06089 3.64813 8.07888 3.65972 7.09714C3.69007 4.49186 5.41763 2.12443 7.89129 1.3179C8.36506 1.16338 8.86531 1.08944 9.35342 0.978516ZM14.04 10.321C14.04 9.49768 14.0469 8.69612 14.0372 7.89484C14.0314 7.42549 14.0414 6.95007 13.9718 6.48817C13.6457 4.31968 11.4524 2.74195 9.29354 3.10037C7.17969 3.45107 5.74929 5.12373 5.73853 7.26407C5.73384 8.20498 5.73743 9.14615 5.73798 10.0871C5.73798 10.1638 5.7446 10.2405 5.74819 10.321C8.51957 10.321 11.2598 10.321 14.04 10.321ZM9.88457 14.4809C8.99416 14.4842 8.19481 15.0664 7.91475 15.9154C7.63634 16.7589 7.92192 17.6764 8.65147 18.2081C8.81095 18.3242 8.86062 18.4412 8.85786 18.628C8.8482 19.293 8.85206 19.958 8.85593 20.623C8.85675 20.7515 8.86282 20.8848 8.89732 21.0073C9.03279 21.4883 9.51318 21.8086 9.9897 21.749C10.5222 21.6822 10.9071 21.2879 10.9174 20.7609C10.9312 20.0557 10.9295 19.3498 10.9187 18.6443C10.9157 18.4478 10.967 18.3253 11.1326 18.2036C11.8607 17.6681 12.1408 16.7523 11.8583 15.908C11.5735 15.0553 10.7742 14.4776 9.88457 14.4809Z" fill="black" />
                                                                                </svg>}
                                                                        </div>
                                                                    }
                                                                </div>
                                                        )
                                                    }

                                                    return (
                                                        <div
                                                            className='Row'
                                                            key={key}
                                                            style={{
                                                                ...style,
                                                            }}
                                                        >
                                                            {items}
                                                        </div>
                                                    )
                                                }
                                            }
                                        />
                                    </section>
                                )
                            }}
                        </AutoSizer>

                    </> :
                    <div className="no-data-found-container">
                        {/* <Error color="warning" sx={{ fontSize: 30 }} /> */}
                        <img alt="placeholder" src={noContentFound} />
                        {/* <img className="search-item-img" src="/noContentFound.svg" /> */}
                        <h2 className="no-data-found">No data found related to search</h2>
                    </div>

            }
            <ParentalLock close={() => setShowParentalLock(false)} open={showParentalLock} completed={handlePinVerified} action={"verify"} />
        </div>
    </div>
}

export default SearchedItems;