import { AES, enc } from 'crypto-js';
import { endpoint } from '../config/endpoints';
// import { baseUrl } from '../config/url';
import { AppContext } from '../contexts/app';
import axios from 'axios'
import { useContext } from 'react'

const useApi = () => {
   const { user } = useContext(AppContext)


   const makeRequest = (extraHeader) => {
      const { username, password, server, loginType, token } = user
      const decryptedServerAddress = server && AES.decrypt(server, "thisisserveraddress").toString(enc.Utf8);
      const decryptedPassword = password && AES.decrypt(password, "thisispassword").toString(enc.Utf8);

      const headers = {
         username,
         password,
         server,
         type: loginType,
         token,
         ...extraHeader
      };

      return {
         get: async (endpoint) => {

            if (loginType === 'player-api') {
               return await axios.get(`${decryptedServerAddress}/player_api.php?username=${username}&password=${decryptedPassword}&action=${endpoint}`)
            }
            else if (loginType === 'one-stream-panel') {
               if (endpoint === 'get_vod_streams') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/content/vod?token=${token}&category_id=all`)
               }
               else if (endpoint === 'get_vod_categories') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/categories/vod?token=${token}`)

               }
               else if (endpoint === 'get_series') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/content/series?token=${token}&category_id=all`)

               }
               else if (endpoint === 'get_series_categories') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/categories/series?token=${token}`)

               }
               else if (endpoint === 'get_live_streams') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/content/live?token=${token}&category_id=all`)

               } else if (endpoint === 'get_live_categories') {
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/categories/live?token=${token}`)
               }
               else if (endpoint.includes('get_vod_info')) {
                  const params = new URLSearchParams(endpoint.split('&')[1]);
                  const vodId = params.get('vod_id');
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/content/vod/${vodId}?token=${token}`)

               }
               else if (endpoint.includes('get_series_info')) {
                  const params = new URLSearchParams(endpoint.split('&')[1]);
                  const seriesId = params.get('series_id');
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/content/series/${seriesId}?token=${token}`)

               }
               else if (endpoint.includes('get_short_epg')) {
                  const params = new URLSearchParams(endpoint.split('&')[1]);
                  const stream_id = params.get('stream_id');
                  return await axios.get(`${decryptedServerAddress}/play/b2c/v1/epg/${stream_id}/short?token=${token}`)

               }
            }

         },
         // post: async (endpoint, data) => await axios.post(`${baseUrl}${endpoint}` , data , {
         //     headers : headers
         // }),
      }
   }

   return { makeRequest }
}

export default useApi