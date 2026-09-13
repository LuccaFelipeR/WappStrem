import React, { useEffect, useState, useContext } from 'react'
import "./styles.css"
import { AppContext } from '../../contexts/app';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../../firebase';
import axios from 'axios';
// import { baseUrl } from '../../config/url';
import { AES, enc } from 'crypto-js';
import Loading from '../../helpers/loading';
import { migrateData } from '../../firebase/functions';
import editIcon from "../../assets/edit.svg"
import deleteIcon from "../../assets/delete.svg"
import DeleteModal from './deleteModal';
import EditModal from './editModal';
import { endpoint } from '../../config/endpoints';
// import { getDbAddress, getDbAddressM3u } from '../../helpers/methods/getDbAddress';
import { Link, useNavigate } from 'react-router-dom';
import { getDbAddress, getDbAddressM3u } from '../../helpers/methods/getDbAddress';
import logo from "../../assets/logo.png"

const Profiles = () => {
  const router = useNavigate();
    const [usersList, setUsersList] = useState(null);
    const { user: contextUser, toggleUser, streamData, alert, m3uStreams, m3uUrl, homeM3uStreams, scrolled, epgSrc } = useContext(AppContext);
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [manageProfilesClicked, setManageProfilesClicked] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [currentProfileToDelete, setCurrentProfileToDelete] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    useEffect(() => {
        if (typeof window !== undefined) {
            const listUsers = localStorage.getItem("listUser") && JSON.parse(localStorage.getItem("listUser"));
            if (listUsers && listUsers.length > 0) {
                setUsersList(JSON.parse(localStorage.getItem("listUser")));
                setTimeout(() => {
                    setShow(true)
                }, 500);
            } else {
                router("/");
            }
        }

    }, [])


    const selectProfileHandler = (user) => {
        if (!manageProfilesClicked) {

            localStorage.setItem("currentUser", JSON.stringify(user));
            const userDetail = Object.values(user)[0];
            const playlist = Object.keys(user)[0];
            const { username, password, portallink, serverInfo, id, parentalPin, loginType, player } = userDetail;
            const storedUser = {
                id,
                username,
                password,
                parentalPin,
                serverPrefix: portallink,
                server: portallink,
                serverInfo,
                playlist,
                loginType,
                M3U: loginType === 'm3u' ? userDetail?.M3U : null

            };

            loginUser(storedUser)
            localStorage.setItem('player', 'flowplayer')

        }
    }

    // const getCurrentEpg = async (user) => {

    //     const decryptedServerAddress = AES.decrypt(user.server, "thisisserveraddress").toString(enc.Utf8);
    //     const decryptedPassword = AES.decrypt(user.password, "thisispassword").toString(enc.Utf8);
    //     const defaultEpgSrc = `${decryptedServerAddress}/xmltv.php?username=${user.username}&password=${decryptedPassword}`;
    //     const headers = {
    //         username: user.username,
    //         password: user.password,
    //         server: user.server,
    //         type: user.loginType,
    //         token: user.token,
    //         epgSrc: null
    //     };
    //     try {
    //         const response = await axios.get(`${baseUrl}${endpoint.getEpgSrc}`, {
    //             headers: headers,
    //         });
    //         epgSrc.toggle({
    //             name: "Inbuilt EPG Source",
    //             src: defaultEpgSrc,
    //             data: response.data.message
    //         })
    //         localStorage.setItem("currentEpgSrc", JSON.stringify({
    //             name: "Inbuilt EPG Source",
    //             src: defaultEpgSrc,
    //         }))
    //     } catch (error) {
    //         console.log("Error", error)
    //     }
    // }



    const loginUser = async (profileUser) => {
        setLoading(true);
        const { username, password, server, playlist, id, parentalPin, loginType, M3U, player } = profileUser;
        if (loginType !== 'm3u') {
            const { movies, series } = streamData;
            const { username, password, server, playlist, id, parentalPin, loginType, player } = profileUser;
        
            const convertedUrl = server && AES.decrypt(server, "thisisserveraddress").toString(enc.Utf8);
            const decryptedPassword = AES.decrypt(password, "thisispassword").toString(enc.Utf8);
            const dataToSend = {
              username: username,
              password: decryptedPassword,
          }
            const params = new URLSearchParams(dataToSend).toString();
         
            try {
              if (loginType === 'player-api'){
                
        
                const response = await axios.get(`${convertedUrl}/player_api.php?${params}`);
                const { user_info, server_info } = response.data;
                const getTimeDifference = () => {
                    const encryptedTime = server_info.time_now;
                    const difference = new Date().getTime() - new Date(encryptedTime).getTime();
                    return Number((((difference) / 1000) / 3600).toFixed(2));
                }
                const serverInfo = AES.encrypt(JSON.stringify(server_info), "thisisserverinfo").toString();
                const userInfo = AES.encrypt(JSON.stringify(user_info), "thisisuserinfo").toString();

                if (user_info.auth === 1 && user_info.status === "Active") {
                    const credentials = {
                        [playlist]: {
                            id,
                            username,
                            password,
                            parentalPin,
                            portallink: server,
                            serverInfo,
                            userInfo,
                            timeDifference: getTimeDifference(),
                            loginType,
                            player
                        }
                    };
                    const user = {
                        id,
                        username,
                        password,
                        parentalPin,
                        serverPrefix: server,
                        server: server,
                        serverInfo,
                        userInfo,
                        timeDifference: getTimeDifference(),
                        loginType,
                        player
                    }
                    const existingUsers = JSON.parse(localStorage.getItem("listUser"));
                    const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
                    localStorage.setItem("currentUser", JSON.stringify(credentials));
                    toggleUser({
                        ...user,
                        dbAddress: getDbAddress(user, null),
                        decryptedDbAddress: getDbAddressM3u(user, 'decrypted')
                    });
                    movies.toggle(null, "streams")
                    movies.toggle(null, "categories")
                    series.toggle(null, "streams")
                    series.toggle(null, "categories");
                    movies.banner.toggle(null);
                    series.banner.toggle(null);
                    scrolled.toggle(0, 0, 0)
                    epgSrc.toggle(null)
                    homeM3uStreams.toggle(null);
                    // getCurrentEpg(user);
                    await firebaseSignIn();
                    migrateData(getDbAddress(user, 'decrypted'), getDbAddress(user, null));

                } else {
                    alert.toggle({
                        title: "Invalid Username/Password",
                        type: "error",
                        show: true
                    })
                }
              } else {
                const response = await axios.post(`${convertedUrl}/play/b2c/v1/auth`,{
                  username,
                  password : decryptedPassword,
                  server: convertedUrl,
              });
              const token = response?.data?.auth_token;
              const resp = await axios.get(`${convertedUrl}/play/b2c/v1/user-info?token=${token}`)
              const { user_info, server_info } = resp.data;
              const getTimeDifference = () => {
                  const encryptedTime = server_info.time_now;
                  const difference = new Date().getTime() - new Date(encryptedTime).getTime();
                  return Number((((difference) / 1000) / 3600).toFixed(2));
              }
              const serverInfo = AES.encrypt(JSON.stringify(server_info), "thisisserverinfo").toString();
              const userInfo = AES.encrypt(JSON.stringify(user_info), "thisisuserinfo").toString();

              if (user_info.auth === 1 && user_info.status === "Active") {
                  const credentials = {
                      [playlist]: {
                          id,
                          username,
                          password,
                          parentalPin,
                          portallink: server,
                          serverInfo,
                          userInfo,
                          timeDifference: getTimeDifference(),
                          loginType,
                          token,
                          player
                      }
                  };
                  const user = {
                      id,
                      username,
                      password,
                      parentalPin,
                      serverPrefix: server,
                      server: server,
                      serverInfo,
                      userInfo,
                      timeDifference: getTimeDifference(),
                      loginType,
                      token,
                      player
                  }
                  const existingUsers = JSON.parse(localStorage.getItem("listUser"));
                  const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
                  localStorage.setItem("currentUser", JSON.stringify(credentials));
                  toggleUser({
                      ...user,
                      dbAddress: getDbAddress(user, null),
                      decryptedDbAddress: getDbAddressM3u(user, 'decrypted')
                  });
                  movies.toggle(null, "streams")
                  movies.toggle(null, "categories")
                  series.toggle(null, "streams")
                  series.toggle(null, "categories");
                  movies.banner.toggle(null);
                  series.banner.toggle(null);
                  scrolled.toggle(0, 0, 0)
                  epgSrc.toggle(null)
                  homeM3uStreams.toggle(null);
                  // getCurrentEpg(user);
                  await firebaseSignIn();
                  migrateData(getDbAddress(user, 'decrypted'), getDbAddress(user, null));

              } else {
                  alert.toggle({
                      title: "Invalid Username/Password",
                      type: "error",
                      show: true
                  })
              }
              }
            } catch (error) {
                console.log(error)
                alert.toggle({
                    title: "Invalid Username/Password",
                    type: "error",
                    show: true
                })
            }
            setLoading(false);
        } else {

            const credentials = {
                [playlist]: {
                    id,
                    username,
                    password,
                    parentalPin,
                    portallink: server,
                    loginType,
                    M3U
                }
            };
            const user = {
                id,
                username,
                password,
                parentalPin,
                serverPrefix: server,
                server: server,
                loginType,
                M3U
            }
            const existingUsers = JSON.parse(localStorage.getItem("listUser"));
            const updatedUsers = JSON.stringify(existingUsers ? [...existingUsers, credentials] : [credentials]);
            localStorage.setItem("currentUser", JSON.stringify(credentials));
            toggleUser({
                ...user,
                dbAddress: getDbAddressM3u(user)
            });

            m3uStreams.toggle(null, null, null);
            homeM3uStreams.toggle(null);
            scrolled.toggle(0, 0, 0)
            m3uUrl.toggle(user.M3U)
            await firebaseSignIn();
        }


    }

    const firebaseSignIn = async () => {
        try {
            const response = await signInAnonymously(auth);
            if (response) {
                setShow(false);
                setTimeout(() => {
                    router('/dashboard?view=movies')
                }, 500);
            }

        } catch (error) {
            console.log(error)
        }
    }
    const deleteProfile = () => {
        const { user } = currentProfileToDelete;
        setDeleteModal(false);
        const { id } = Object.values(user)[0]
        const usersList = JSON.parse(localStorage.getItem('listUser'));
        const updatedUsers = usersList.filter(item => Object.values(item)[0].id !== id);

        setShow(false);

        setTimeout(() => {
            setUsersList(updatedUsers)
            localStorage.setItem("listUser", JSON.stringify(updatedUsers));
            setShow(true);
        }, 1000);
    }

    const Profile = ({ user, index }) => {

        const { profileColor } = Object.values(user)[0];

        return <div onClick={() => selectProfileHandler(user)} className='single-profile'><span
            className="thumb"><svg width="176" height="205" viewBox="0 0 176 205" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M87.7082 204.703C64.2597 204.703 40.8091 204.729 17.3606 204.692C6.80232 204.675 -0.252919 197.488 0.0670946 186.957C0.192967 182.82 0.478846 178.632 1.27035 174.581C7.41248 143.158 31.2642 120.275 62.9775 115.248C65.4608 114.856 67.9954 114.628 70.5085 114.611C81.7133 114.538 92.9202 114.391 104.121 114.598C135.885 115.184 164.059 136.95 172.798 167.483C174.581 173.713 175.571 180.062 175.674 186.56C175.846 197.678 169.011 204.692 157.834 204.699C134.458 204.711 111.082 204.703 87.7082 204.703Z" fill={profileColor} /> <path d="M142.507 55.0326C142.543 85.1651 117.996 109.723 87.842 109.721C57.701 109.719 33.1346 85.1352 33.1837 55.0241C33.2327 24.9321 57.5922 0.585455 87.7375 0.495851C117.921 0.406247 142.471 24.851 142.507 55.0326Z" fill="#F0B696" /> </svg>

            <div className='edit-delete-icons-container'
                style={{
                    display: manageProfilesClicked ? "flex" : "none"
                }}
            >
                <img
                    onClick={() => {
                        setCurrentProfileToDelete({
                            user,
                            index
                        })
                        setEditModalOpen(true)
                    }}
                    src={editIcon}
                    alt='edit-icon'
                />
                <img
                    onClick={() => {
                        setCurrentProfileToDelete({
                            user,
                            index
                        })
                        setDeleteModal(true)
                    }}
                    src={deleteIcon}
                    alt='delete-icon'
                />

            </div>
        </span><span className="text">{Object.keys(user)[0]}</span>

        </div>

    };

    const handleEditPlaylist = (playlistDetails) => {
        const { playlistName, username, password, portallink } = playlistDetails;
        const foundUser = Object.values(currentProfileToDelete.user)[0];
        const { id } = foundUser;
        const usersList = JSON.parse(localStorage.getItem('listUser'));
        const existingUsers = usersList.filter(user => Object.values(user)[0].id !== id);
        const updatedUser = {
            [playlistName]: {
                ...foundUser,
                username,
                password,
                portallink
            }
        };
        const userExist = usersList.filter(item => {
            return Object.keys(item)[0] === playlistName
        });
        if (userExist.length > 0 && id !== Object.values(userExist[0])[0].id) {
            alert.toggle({
                title: "This playlist already exists ! Try another one",
                show: true,
                type: "warning"
            })
        } else {
            existingUsers.splice(currentProfileToDelete.index, 0, updatedUser);
            const updatedUsersList = existingUsers;
            setShow(false);
            setEditModalOpen(false);
            setTimeout(() => {
                setUsersList(updatedUsersList);
                localStorage.setItem('listUser', JSON.stringify(updatedUsersList))
                setShow(true);
                setManageProfilesClicked(false)
            }, 1000);
        }

    };



    return (
      usersList && (
        <section
          style={{
            transition: '.5s',
            opacity: show ? 1 : 0,
            transform: show ? 'scale(1)' : 'scale(0.9)'
          }}
          className="profileSection"
        >
            <img src={logo} style={{
                    objectFit: "contain",
                    marginTop: 10
                }} alt='app-logo' />
     
          {loading && <Loading />}
          <div className="profileList">
            {usersList.map((user, index) => {
              return <Profile key={index} user={user} index={index} />
            })}
             <Link to={'/?action=add-profile'} className="add">
              <span className="thumb">
                <svg
                  width="99"
                  height="98"
                  viewBox="0 0 99 98"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {' '}
                  <circle cx="49.5107" cy="49.3452" r="48.583" fill="#615DFC" />{' '}
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M54.1439 29.9121H45.1189V44.9539L30.0762 44.9539L30.0762 53.9789H45.1189V70.0234H54.1439V53.9789H70.1875V44.9539L54.1439 44.9539V29.9121Z"
                    fill="white"
                  />{' '}
                </svg>
              </span>
              <span className="text">Add Playlist</span>
            </Link>
          </div>
          <div className="manage-profile-btn-container">
            {usersList.length > 0 ? (
              manageProfilesClicked ? (
                <button
                  className="manage-profile-btn"
                  style={{ background: 'var(--md-source)' }}
                  onClick={() => setManageProfilesClicked(false)}
                >
                  Back
                </button>
              ) : (
                <button
                  className="manage-profile-btn"
                  onClick={() => setManageProfilesClicked(true)}
                >
                  Manage Playlists
                </button>
              )
            ) : null}
          </div>
          <DeleteModal
            open={deleteModal}
            deleteProfile={deleteProfile}
            onClose={() => setDeleteModal(false)}
          />
          <EditModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            defaultPlaylist={currentProfileToDelete && currentProfileToDelete.user}
            onEdit={handleEditPlaylist}
          />
        </section>
      )
    )
}

export default Profiles
