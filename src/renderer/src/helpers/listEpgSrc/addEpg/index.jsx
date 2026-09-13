import { useState, useEffect, useContext } from "react"
import "./styles.css";
import { Dialog } from "@mui/material";
import { getLocal } from "../../../helpers/local";
import { AppContext } from "../../../contexts/app";
import { isURL } from "../../../helpers/methods/isUrl";
import { v4 } from "uuid"

const AddEpg = ({ open, close, completed, action, noEscape, preFilled }) => {

    const { epgSrcList, alert } = useContext(AppContext);
    const [epgName, setEpgName] = useState("");
    const [epgSource, setEpgSource] = useState("");

    useEffect(() => {
        if (preFilled) {
            setEpgName(preFilled.name)
            setEpgSource(preFilled.src)
        } else {
            setEpgName("");
            setEpgSource("");
        }
    }, [preFilled])

    const addEpg = () => {
        if (isURL(epgSource)) {

            const { list } = epgSrcList;
            const exists = list && list.filter(item => (item.name === epgName) || (item.src === epgSource)).length > 0;
            const currentUser = getLocal("currentUser") && getLocal("currentUser");
            const { id } = Object.values(currentUser)[0];
            const newEpgSrc = {
                id: v4(),
                name: epgName,
                src: epgSource,
                playlistId: id
            };
            if (!exists) {
                const parsedData = list ? JSON.stringify([...epgSrcList.list, newEpgSrc]) : JSON.stringify([newEpgSrc]);
                localStorage.setItem("epgSources", parsedData);
                epgSrcList.toggle(list ? [...list, newEpgSrc] : [newEpgSrc])
                close()
            } else {
                alert.toggle({
                    show: true,
                    title: "Epg already exists ! Try again",
                    type: "warning"
                })
            }

        } else {
            alert.toggle({
                show: true,
                title: "Invalid URL ! Try again",
                type: "error"
            })
        }

    }

    const handleUpdate = () => {
        const { list } = epgSrcList;
        const epgSrcIndex = list.indexOf(list.filter(epg => epg.id === preFilled.id)[0]);
        list[epgSrcIndex].name = epgName;
        list[epgSrcIndex].src = epgSource;
        const parsedList = JSON.stringify(list);
       localStorage.setItem("epgSources", parsedList);
       epgSrcList.toggle(list)
       close();
    }

    const handleDelete = () => {
        const { id } = preFilled;
        const { list } = epgSrcList;
        const updatedEpgSrcList = list.filter(epg => epg.id !== id);
        const parsedList = JSON.stringify(updatedEpgSrcList)
        localStorage.setItem("epgSources", parsedList);
        epgSrcList.toggle(updatedEpgSrcList)
        close();

    }

    const handleSave = () => {
        // const newEpgSrc = {
        //     name: epgName,
        //     src: epgSource
        // };
        // const getEpgList = localStorage.getItem("epgSources") ? JSON.parse(localStorage.getItem("epgSources")) : [];
        // const exists = getEpgList.filter(item => item.epgName === epgName).length > 0
        // if (!exists) {
        //     const parsedData = JSON.stringify([...getEpgList, newEpgSrc]);
        //     localStorage.setItem("epgSources", parsedData);
        // };
        addEpg();
    };

    const handleChange = (e, setFn) => {
        const { value } = e.target;
        setFn(value)
    }



    return <Dialog sx={{
        background: 'rgba(0,0,0,0.6)'
    }} open={open} onClose={noEscape ? () => { } : close}>
        <div className="enter-parental-lock-container">
            {/* <Close className="close-icon"/> */}
            <div className="heading"><h2>
                {preFilled ? "Update Epg Source" : "Add EPG Source"}
            </h2></div>
            <br />
            <br />
            <div style={{ width: '90%', display: 'flex', flexDirection: "column", justifyContent: "center", alignItems: "center" }}>

                <div className="players">
                    <input
                        value={epgName}
                        onChange={(e) => handleChange(e, setEpgName)} type="text" placeholder="Epg Source Name" />
                    <input
                        value={epgSource}
                        onChange={(e) => handleChange(e, setEpgSource)} type="text" placeholder="Epg Source Provider" />
                </div>

                <div className="add-btns" >
                    <button onClick={preFilled ? handleUpdate : handleSave} className="btn btn-primary playBtn"> {preFilled ? "Update" : "Add"}</button>
                    {preFilled && <button onClick={handleDelete} className="btn btn-primary">Delete</button>}
                    <button onClick={close} className="btn btn-primary ">Cancel</button>
                </div>
            </div>


        </div>
    </Dialog>
}

export default AddEpg;