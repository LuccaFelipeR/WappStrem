import { get, getDatabase, push, ref, remove, set, update } from "firebase/database"
import { app, auth } from ".";

const database = getDatabase(app);

//Favs

export const addToFavs = async (id, type, address) => {
    const obj = {}
    obj[id] = parseInt(Date.now()/1000)
    return await update(ref(database, `${address}/Fav/${type}`), obj)
}

export const removeFromFavs = async (id, type, address) => {
    return await remove(ref(database, `${address}/Fav/${type}/${id}`))
}

export const getValue = async (id, type, address) => {
    return get(ref(database, `${address}/Fav/${type}/${id}`))
}

export const getFavourites = async (type, address) => {
    return get(ref(database, `${address}/Fav/${type}`))
}


export const migrateData = async (decrypted, encrypted) => {
    const exists = (await get(ref(database, encrypted))).exists();
    if (!exists) {
        const preFav = (await get(ref(database, `${decrypted}/Fav`))).val();
        if (preFav) {

            const { LiveTv: liveFav, Movie: movieFav, Series: seriesFav } = preFav;
            const liveFavIds = liveFav && Object.keys(liveFav);
            const movieFavIds = movieFav && Object.keys(movieFav);
            const seriesFavIds = seriesFav && Object.keys(seriesFav);
            if (liveFavIds) {
                if (liveFavIds) { }
                const updatedLiveIds = {};
                liveFavIds.map(id => updatedLiveIds[id] = parseInt(Date.now()/1000))
                await update(ref(database, `${encrypted}/Fav/LiveTv`), updatedLiveIds);
            }
            if (movieFavIds) {
                const updatedMovieids = {};
                movieFavIds.map(id => updatedMovieids[id] = parseInt(Date.now()/1000))
                await update(ref(database, `${encrypted}/Fav/Movie`), updatedMovieids);
            }
            if (seriesFavIds) {
                const updatedSeriesids = {};
                seriesFavIds.map(id => updatedSeriesids[id] = parseInt(Date.now()/1000))
                await update(ref(database, `${encrypted}/Fav/Series`), updatedSeriesids);
            }
        }
        const preRecent = (await get(ref(database, `${decrypted}/Recent`))).val();
        if (preRecent) {

            const { LiveTv: liveRecents, Movie: movieRecents, Series: seriesRecents } = preRecent;
            const liveRecentsIds = liveRecents && Object.keys(liveRecents);
            const movieRecentsIds = movieRecents && Object.keys(movieRecents);
            const movieRecentsValues = movieRecents && Object.values(movieRecents);
            const seriesRecentsIds = seriesRecents && Object.keys(seriesRecents);
            const seriesRecentsValues = seriesRecents && Object.values(seriesRecents);
            if (liveRecentsIds) {
                const updatedLiveIds = {};
                liveRecentsIds.map(id => updatedLiveIds[id] = parseInt(Date.now()/1000))
                await update(ref(database, `${encrypted}/Recent/LiveTv`), updatedLiveIds);
            }
            if (movieRecentsIds) {
                const updatedMovieids = {};
                movieRecentsIds.forEach((id, index) => updatedMovieids[id] = {
                    ...movieRecentsValues[index],
                    timestamp: parseInt(Date.now()/1000)
                })
                await update(ref(database, `${encrypted}/Recent/Movie`), updatedMovieids);
            }
            if (seriesRecentsIds) {
                const updatedSeriesids = {};
                const updatedEpisodesIds = {};
                seriesRecentsIds.map((id, index) => {
                    const { duration, episode, season, thumbnail, timeline } = seriesRecentsValues[index];
                    const { e } = seriesRecentsIds[index];
                    updatedSeriesids[id] = {
                        [episode]: {
                            duration, season, thumbnail, timeline, lastWatched: 'true'
                        },
            showInContinueWatchingList: 'true',
                        timestamp: parseInt(Date.now()/1000)
                    }
                });
                await update(ref(database, `${encrypted}/Recent/Series`), updatedSeriesids);
            }

        }
        await update(ref(database, `${encrypted}`), { migrated: true })

    } else {
        await update(ref(database, `${encrypted}`), { migrated: true })

    }
}

//Recent

export const saveWatchedContent = {
    movie: async (id, address, movie) => {
        const obj = {}
        obj[id] = {
            ...movie,
            timestamp: parseInt(Date.now()/1000)
        }
        return await update(ref(database, `${address}/Recent/Movie`), obj)
    },
    series: async (series_id, address, episode, episodeId) => {

        const episodes = (await get(ref(database, `${address}/Recent/Series/${series_id}`))).val();
        if(episodes){
            const keys = Object.keys(episodes);
            keys.map(key => {
                const isNumber = key;
                if (isNumber && key !== "showInContinueWatchingList" && key !== "timestamp") {
                    episodes[key].lastWatched = 'false'
                }
            })
            episodes[episodeId] = episode
           return await update(ref(database, `${address}/Recent/Series/${series_id}`), {
                ...episodes,
            showInContinueWatchingList: 'true',
                timestamp: parseInt(Date.now()/1000)
            });
        }else{
           return await update(ref(database, `${address}/Recent/Series/${series_id}`), {
                [episodeId]: episode,
            showInContinueWatchingList: 'true',
                timestamp: parseInt(Date.now()/1000)
            });
        }
     
        // return await set(ref(database, `${address}/Recent/Series/${series_id}/${episodeId}`), episode)
    },
    liveTv: async (stream_id, address) => {
        const obj = {};
        obj[stream_id] = parseInt(Date.now()/1000)
        return await update(ref(database, `${address}/Recent/LiveTv`), obj)
    },
    catchup: async (stream_id, address) => {
        const obj = {};
        obj[stream_id] = parseInt(Date.now()/1000)
        return await update(ref(database, `${address}/Recent/Catchup`), obj)
    },
    home: async (stream_id, address) => {
        const obj = {};
        obj[stream_id] = "true"
        return await update(ref(database, `${address}/Recent/Home`), obj)
    }
}

export const getRecents = async (type, address) => {
    return await get(ref(database, `${address}/Recent/${type}`))
};

export const getParticluarTimeline = async (id, type, address) => {
    return await get(ref(database, `${address}/Recent/${type}/${id}`));
}

export const removeMovieFromRecents = async (id, type, address, action) => {
    if(type === 'Movie' && !action){
        return await remove(ref(database, `${address}/Recent/${type}/${id}`));
    }
    if(type === 'Series' && action === 'remove'){
        return await remove(ref(database, `${address}/Recent/${type}/${id}`));
    }
    if(type === 'LiveTv'){
        return await remove(ref(database, `${address}/Recent/${type}/${id}`));
    }
    else{
        return await update(ref(database, `${address}/Recent/${type}/${id}`), {
            showInContinueWatchingList: 'false'
        });
    }
}