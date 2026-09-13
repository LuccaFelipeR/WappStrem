import React, { useEffect, useContext } from 'react'
import "./styles.css"
import { endpoint } from '../../config/endpoints';
import { Box, Grow } from '@mui/material';
import AllList from './list';
import DashboardHeader from './header';
import { AppContext } from '../../contexts/app';
import useApi from '../../hooks/useApi';
import { UpcomingRounded } from '@mui/icons-material';
import M3uSearch from './search/m3u';
import SearchItems from './search';
import Loading from '../../helpers/loading';
import M3uList from './list/m3u';
import { useSearchParams } from 'react-router-dom';
import { AES, enc } from 'crypto-js';
import axios from 'axios';

const Dashboard = () => {
    const { makeRequest } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentAction = searchParams.get("view");
    const { user, streamData, m3uStreams, homeM3uStreams } = useContext(AppContext);

    useEffect(() => {
        if (user && user.loginType !== 'm3u') {

            getData(endpoint.getMovies, "movies");
            getData(endpoint.getMovieCategories, "moviesCategories");
            getData(endpoint.getSeries, "series");
            getData(endpoint.getSeriesCategories, "seriesCategories");
            getData(endpoint.getLiveStreams, "livetv");
            getData(endpoint.getLiveCategories, "liveCategories")
        }
    }, [user, currentAction]);


    const getBannerStreams = async (streams) => {
        const { movies } = streamData;
        if (streams) {
            const f = (streams.length / 2) - 4;
            const l = streams.length / 2
            const moviesIds = streams.slice(f, l).map(movie => movie.stream_id);
            try {
                const decryptedServerAddress = AES.decrypt(user.server, "thisisserveraddress").toString(enc.Utf8);
                const decryptedPassword = user?.password && AES.decrypt(user?.password, "thisispassword").toString(enc.Utf8);
                const username = user?.username;
                const getMovieInfo = async () => {
                    try {
                        const requests = moviesIds.map(async (id) => {
                            const response = await makeRequest().get(`${endpoint.getMovie}&vod_id=${id}`);
                            return response.data; // assuming you want the data part of the response
                        });

                        const moviesData = await Promise.all(requests);
                        movies.banner.toggle(moviesData); // This will contain all the results in an array
                    } catch (error) {
                        movies.banner.toggle(null); // This will contain all the results in an array
                        console.error('Error fetching movie info:', error);
                    }
                };
                getMovieInfo();
                // const response = await makeRequest().post(endpoint.getBannerMovies, { moviesIds });
                // if (response.data.message === 'Something went wrong') {
                //     movies.banner.toggle(null)
                // } else {
                //     movies.banner.toggle(response.data.message);
                // }

            } catch (error) {
                console.log(error);
                movies.banner.toggle(null);
            }
        } else {
            movies.banner.toggle(null);
        }
    }


    const getData = async (endpoint, type) => {
        const { movies, series, liveTv } = streamData;
        try {
            const response = await makeRequest().get(endpoint)

            const message = user?.loginType === "one-stream-panel" ? response.data.content : response.data;
            const fetchedData = message === "Something went wrong!" ? [] : message;
            switch (type) {
                case "movies":
                    movies.toggle(fetchedData, "streams");
                    getBannerStreams(fetchedData);
                    break;
                case "moviesCategories":
                    movies.toggle(fetchedData, "categories")
                    break;
                case "series":
                    series.toggle(fetchedData, "streams");
                    series.banner.toggle(fetchedData.slice(0, 4))
                    break;
                case "seriesCategories":
                    series.toggle(fetchedData, "categories")
                    break;
                case "livetv":
                    liveTv.toggle(fetchedData, "streams")
                    break;
                case "liveCategories":
                    liveTv.toggle(fetchedData, "categories");
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.log(error)
        }
    }

    const conditionVerified = () => {
        const { movies, series } = streamData;
        if (currentAction === "movies") {
            return (movies.streams && movies.streamCategories)
        }
        if (currentAction === "series") {
            return (series.streams && series.streamCategories)
        }
    }

    const dataFetched = () => {
        if (user.loginType === 'm3u') {
            return true
        } else {
            return streamData.movies.streams && streamData.movies.streamCategories &&
                streamData.series.streams && streamData.series.streamCategories && streamData.liveTv.streams

        }
    }

    return (
        user && dataFetched() ?
            <div>
                <DashboardHeader
                    dataFetched={dataFetched}
                    currentAction={currentAction}
                />
                {

                    currentAction === "search" ?
                        user && user.loginType === 'm3u' ?
                            <M3uSearch /> :
                            <SearchItems /> :
                        user && user.loginType === 'm3u' ?
                            <AllList currentAction={currentAction} /> :
                            (currentAction === "movies" || currentAction === "series")
                                ? conditionVerified() ?
                                    <>
                                        <AllList currentAction={currentAction} />
                                    </>
                                    :
                                    <Loading /> : <>
                                    <br />
                                    <Grow className='invalid-user-popup' in={true} >
                                        <Box display="flex" flexDirection="column" alignItems="center">
                                            <UpcomingRounded className='cross-icon' color='error' />
                                            <p className='invalid-title'>Coming Soon</p>
                                        </Box>
                                    </Grow>
                                </>
                }

            </div>
            :
            <Loading />
    )
}

export default Dashboard