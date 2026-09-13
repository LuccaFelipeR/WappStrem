import { AppContext } from "../../../contexts/app";
import { useContext } from "react"
import LiveTv from "./common";
import M3ULive from "./m3u";

const Live = () => {

    const { user } = useContext(AppContext);
    return (
            user && user.loginType !== 'm3u' ?
                <LiveTv /> :
                <M3ULive />
    )
}

export default Live;