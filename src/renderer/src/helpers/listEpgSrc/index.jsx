import "./styles.css";
import { Alert, Checkbox, CircularProgress, Dialog, FormControl, FormControlLabel, Radio, RadioGroup, Slide } from "@mui/material";
import { useState, useContext, useEffect } from "react"
import { AppContext } from "../../contexts/app";
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AddEpg from "./addEpg";
import { getLocal } from "../../helpers/local";
import axios from "axios";
// import { baseUrl } from "@/config/url";
import useApi from "../../hooks/useApi";
import { endpoint } from "../../config/endpoints";
import { AES, enc } from "crypto-js";
import { ArrowRight, Downloading } from "@mui/icons-material";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const ListEpgSrc = ({ open, close, completed, action, noEscape }) => {

    const { makeRequest } = useApi();

    const { alert, epgSrc, epgSrcList, user } = useContext(AppContext);

    const [openAddEpg, setOpenAddEpg] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingIndex, setLoadingIndex] = useState(0);
    const [currentList, setCurrentList] = useState(null);
    const [defaultLoading, setDefaultLoading] = useState(false);
    const [finalAddress, setFinalAddress] = useState("");
    const [preFilled, setPreFilled] = useState(null);
    const [currentEpgSrc, setCurrentEpgSrc] = useState(null);
    const [defaultAddress, setDefaultAddress] = useState("");

    useEffect(() => {
        if (user && user.loginType !== "m3u") {
            if (epgSrcList.list && user.loginType !== "m3u") {
                const currentUserId = Object.values(getLocal("currentUser"))[0].id;
                const current = epgSrcList.list.filter(item => item.playlistId === currentUserId);
                setCurrentList(current);
                const currentUser = getLocal("currentUser");
                const { username, password: encryptedPassword, serverInfo, portallink } = Object.values(currentUser)[0];
                const serverUrl = AES.decrypt(portallink, "thisisserveraddress").toString(enc.Utf8);
                // const parsedServerInfo = JSON.parse(AES.decrypt(serverInfo, "thisisserverinfo").toString(enc.Utf8));
                const decryptedPassword = AES.decrypt(encryptedPassword, "thisispassword").toString(enc.Utf8);
                const address = serverUrl + "/xmltv.php?username=" + username + "&password=" + decryptedPassword
                const parsedUrl = getParsedUrl(address);
                setFinalAddress(parsedUrl);
                setDefaultAddress(address);
                if (epgSrc.list && (epgSrc.list.length === 0)) {
                    handleDefaultEpgSrc()
                }
            }
        }

    }, [epgSrcList.list]);

    useEffect(() => {
        if (epgSrc.currentEpgSrc) {
            setCurrentEpgSrc(getParsedUrl(epgSrc.currentEpgSrc.src));
        }
    }, [epgSrc])

    const getParsedUrl = (url) => {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const username = urlObj.searchParams.get("username");
        const password = urlObj.searchParams.get("password");
        const parsedUrl = domain + username + password;
        return parsedUrl
    }

    const handleEpgDownload = (epg, index) => {
        getExternalEpgs(epg, "no-default");
        setLoadingIndex(index);
    };


    const getExternalEpgs = async (epg, type) => {
        setDefaultLoading(false);
        setLoading(false);

        if (type === "default") {
            setDefaultLoading(true)
        } else {
            setLoading(true);
        }
        try {
            const response = await makeRequest({ epgSrc: epg.src }).get(endpoint.getEpgSrc);
            const { name, src } = epg;
            const data = {
                name,
                data: response.data.message,
                src
            };
            epgSrc.toggle(data);
            localStorage.setItem("currentEpgSrc", JSON.stringify({ name, src }));
            alert.toggle({
                title: "Epg Source Downloaded",
                show: true,
                type: "success"
            })
        } catch (error) {s
            console.log("Error", error)
            alert.toggle({
                title: "Fetching EPG Source failed !",
                show: true,
                type: "error"
            })
        }
        setLoading(false);
        setDefaultLoading(false);
    };

    const handleDefaultEpgSrc = () => {
        const currentUser = getLocal("currentUser");
        const { id, username, password: encryptedPassword, serverInfo } = Object.values(currentUser)[0];
        const parsedServerInfo = JSON.parse(AES.decrypt(serverInfo, "thisisserverinfo").toString(enc.Utf8));
        const decryptedPassword = AES.decrypt(encryptedPassword, "thisispassword").toString(enc.Utf8);
        const address = parsedServerInfo.server_protocol + "://" + parsedServerInfo.url + ":" + (parsedServerInfo.port ? parsedServerInfo.port : 80) + "/xmltv.php?username=" + username + "&password=" + decryptedPassword

        const epg = {
            name: "Inbuilt Epg Source",
            src: address,
            playlistId: id
        }
        getExternalEpgs(epg, "default")

    }

    const handleOpenEpg = (epg) => {
        setPreFilled(epg)
        setOpenAddEpg(true);
    }

    const handleCloseAddEpgModal = () => {
        setOpenAddEpg(false)
        setTimeout(() => {
            setPreFilled(null)
        }, 1000);
    }

    return <Dialog sx={{
        background: 'rgba(0,0,0,0.6)'
    }}
        open={open} onClose={noEscape ? () => { } : close}>
        <div className="add-list-container">
            <h2>EPG</h2>
            <div className="epg-source-listings">
                <FormControl>
                    <RadioGroup
                        defaultValue={currentEpgSrc ? currentEpgSrc : finalAddress}
                        aria-labelledby="demo-radio-buttons-group-label"
                        name="radio-buttons-group"
                    >
                        <div key={0} className="epg-source-container">
                            <div className="radio-and-details">
                                <Radio value={finalAddress} onChange={handleDefaultEpgSrc} sx={{ color: "white", "&.Mui-checked": { color: "#00AC26" } }} />
                                <div className="details">
                                    <p className="title">Inbuilt EPG Source</p>
                                    <p className="desc">{defaultAddress}</p>
                                </div>
                            </div>
                            <div className="download-status-container">
                                {
                                    defaultLoading &&
                                    <CircularProgress style={{ width: "25px", height: "25px", color: "white" }} />
                                }
                                {/* <Radio value={finalAddress} onChange={handleDefaultEpgSrc} sx={{ color: "white", "&.Mui-checked": { color: "white" } }} /> */}
                                {/* <KeyboardArrowRightIcon onClick={handleOpenEpg} className="open-epg-icon" sx={{ color: "white", width: "30px", height: "30px" }} /> */}
                            </div>
                        </div>
                        {currentList &&
                            currentList.map((epg, index) => {
                                return <div key={index + 1} className="epg-source-container">
                                    <div className="radio-and-details">

                                        <Radio value={getParsedUrl(epg.src)} onChange={() => handleEpgDownload(epg, index + 1)} sx={{ color: "white", "&.Mui-checked": { color: "#00AC26" } }} />

                                        <div className="details">
                                            <p className="title">
                                                {epg.name}
                                            </p>
                                            <p className="desc">{epg.src}</p>
                                        </div>
                                    </div>

                                    <div className="download-status-container">
                                        {/* <DownloadForOfflineIcon onClick={() => handleEpgDownload(epg)} sx={{ color: "#8382FF" }} /> */}
                                        {
                                            loading && (loadingIndex === (index + 1)) &&
                                            <CircularProgress style={{ width: "25px", height: "25px", color: "white" }} />
                                        }
                                        <KeyboardArrowRightIcon onClick={() => {
                                            handleOpenEpg(epg);
                                            setPreFilled(epg)
                                        }} className="open-epg-icon" sx={{ color: "white", width: "30px", height: "30px" }} fontSize="30px" />

                                    </div>
                                </div>
                            })
                        }
                    </RadioGroup>
                </FormControl>
            </div>
            <AddCircleIcon onClick={
                () => {
                    setOpenAddEpg(true)
                    setPreFilled(null)
                }
            } className="add-icon" />
        </div>
        <AddEpg
            open={openAddEpg}
            close={handleCloseAddEpgModal}
            preFilled={preFilled}
        />
    </Dialog >
}

export default ListEpgSrc;