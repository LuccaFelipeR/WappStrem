import PinInput from "react-pin-input";
import "./styles.css";
import { CircularProgress, Dialog } from "@mui/material";
import { useState, useEffect, useRef, useContext } from "react"
import { AES, enc } from "crypto-js";
import { AppContext } from "../../contexts/app";

const ParentalLock = ({ open, close, completed, action, noEscape }) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [pin, setPin] = useState("");
    const [previousPin, setPreviousPin] = useState(null);
    const [enteredOldPin, setEnteredOldPin] = useState("");
    const [openNewPin, setOpenNewPin] = useState(false);
    const { parentalVerified } = useContext(AppContext);

    const encryptedPin = (newpin) => AES.encrypt(newpin, "thisispin").toString();

    const inputRef = useRef(null);

    useEffect(() => {
        if (getParentalPin("currentUser")) {
            setPreviousPin(getParentalPin("currentUser"))
        } else {
            setPreviousPin(null);
        }
    }, []);

    const getParentalPin = (key) => {
        if (!key || typeof window === 'undefined') {
            return ""
        }
        const retrievedUser = Object.values(JSON.parse(localStorage.getItem(key)))[0].parentalPin;
        if (retrievedUser) {
            const restoredPin = AES.decrypt(retrievedUser, "thisispin").toString(enc.Utf8);
            return restoredPin;
        }
        return null;
    }

    const savePin = (newpin) => {
        if (newpin.length === 4) {

            const listUsers = JSON.parse(localStorage.getItem("listUser"));
            const users = listUsers.map(user => Object.values(user)[0]);
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            const currentUserId = Object.values(currentUser)[0].id;
            const foundUser = users.filter(user => user.id === currentUserId)[0];
            const updatedUser = { ...foundUser, parentalPin: encryptedPin(newpin) };
            const foundUserKey = Object.keys(listUsers.filter(user => {
                const userId = Object.values(user)[0].id;
                return userId === currentUserId
            })[0])[0];
            const foundUserIndex = listUsers.indexOf(listUsers.filter(user => {
                const userId = Object.values(user)[0].id;
                return userId === currentUserId
            })[0])
            listUsers[foundUserIndex][foundUserKey] = updatedUser;
            currentUser[foundUserKey] = updatedUser;
            localStorage.setItem("listUser", JSON.stringify(listUsers))
            localStorage.setItem("currentUser", JSON.stringify(currentUser))
            handleComplete();
            window.location.reload();
            setError(false)
        } else {
            setError(true)
        }
    }

    const handleComplete = () => {
        setLoading(true);
        setTimeout(() => {
            completed()
            setTimeout(() => {
                setLoading(false)
            }, 500);
        }, 1000);
    }


    const checkPin = (enteredPin) => {
        const existedPin = getParentalPin("currentUser");
        if (existedPin === enteredPin) {
            handleComplete()
            parentalVerified.toggle(true);
        } else {
            setError(true);
        }
    }

    const changePin = () => {

        const handleOldPin = e => {
            setEnteredOldPin(e)
            if (e === previousPin) {
                setOpenNewPin(true);
                inputRef.current.clear()
            } else {
                setError(true);
            }

        };

        const handleNewPin = e => {
            if (e.length === 4) {
                savePin(e)
            }
        }

        return <>
            <p className="enter-pin-code-title">Enter Your {openNewPin ? "New" : "Old"} Code</p>
            {
                openNewPin ?
                    <PinInput
                        secret
                        initialValue={''}
                        inputStyle={{
                            border: "1.5px solid white",
                            borderColor: error ? "red" : "white",
                            borderRadius: 3,
                            marginLeft: 5,
                            marginRight: 5,
                            color: "#615DFC",
                            fontSize: 40
                        }}
                        length={4}
                        onChange={handleNewPin}
                        type="numeric" /> :
                    <PinInput
                        secret
                        inputStyle={{
                            border: "1.5px solid white",
                            borderColor: error ? "red" : "white",
                            borderRadius: 3,
                            marginLeft: 5,
                            marginRight: 5,
                            color: "#615DFC",
                            fontSize: 40
                        }}
                        ref={inputRef}
                        length={4}
                        onChange={() => setError(false)}
                        onComplete={handleOldPin}
                        type="numeric" />
            }

        </>
    }

    const setupPin = () => {
        return <>
            <p className="enter-pin-code-title">Enter Your Pin Code</p>
            <PinInput
                secret
                inputStyle={{
                    border: "1.5px solid white",
                    borderColor: error ? "red" : "white",
                    borderRadius: 3,
                    marginLeft: 5,
                    marginRight: 5,
                    color: "#615DFC",
                    fontSize: 40
                }}
                length={4}
                onChange={e => {
                    setPin(e);
                    setError(false)
                }}
                type="numeric" /> :
        </>
    }

    const disablePin = () => {

        const handleDisable = (e) => {
            if (e === previousPin) {
                localStorage.removeItem("parentalPin");
                const listUsers = JSON.parse(localStorage.getItem("listUser"));
                const users = listUsers.map(user => Object.values(user)[0]);
                const currentUser = JSON.parse(localStorage.getItem("currentUser"));
                const currentUserId = Object.values(currentUser)[0].id;
                const foundUser = users.filter(user => user.id === currentUserId)[0];
                const updatedUser = { ...foundUser, parentalPin: null };
                const foundUserKey = Object.keys(listUsers.filter(user => {
                    const userId = Object.values(user)[0].id;
                    return userId === currentUserId
                })[0])[0];
                const foundUserIndex = listUsers.indexOf(listUsers.filter(user => {
                    const userId = Object.values(user)[0].id;
                    return userId === currentUserId
                })[0])
                listUsers[foundUserIndex][foundUserKey] = updatedUser;
                currentUser[foundUserKey] = updatedUser;
                localStorage.setItem("listUser", JSON.stringify(listUsers))
                localStorage.setItem("currentUser", JSON.stringify(currentUser))
                setLoading(true);
                setTimeout(() => {
                    setLoading(false)
                    completed();
                }, 1000);
                window.location.reload();

            } else {
                setError(true)
            }
        }

        return <>
            <p className="enter-pin-code-title">Enter Your Pin Code</p>
            <PinInput
                secret
                inputStyle={{
                    border: "1.5px solid white",
                    borderColor: error ? "red" : "white",
                    borderRadius: 3,
                    marginLeft: 5,
                    marginRight: 5,
                    color: "#615DFC",
                    fontSize: 40
                }}
                length={4}
                onChange={e => {
                    setError(false)
                }}
                onComplete={handleDisable}
                type="numeric" /> :
        </>
    }

    const verifyPin = () => {
        const handlePin = (e) => {
            checkPin(e)
        }
        return <>
            <p className="enter-pin-code-title">Enter Your Pin Code</p>
            <PinInput
                secret
                inputStyle={{
                    border: "1.5px solid white",
                    borderColor: error ? "red" : "white",
                    borderRadius: 3,
                    marginLeft: 5,
                    marginRight: 5,
                    color: "#615DFC",
                    fontSize: 40
                }}
                length={4}
                onChange={e => {
                    setError(false)
                }}
                onComplete={handlePin}
                type="numeric" /> :
        </>
    }

    return <Dialog sx={{
        background: 'rgba(0,0,0,0.6)',
        zIndex: 999999
    }} open={open} onClose={noEscape ? () => { } : close}>
        <div className="enter-parental-lock-containerr">
            {/* <Close className="close-icon"/> */}
            <div className="heading" ><p>
                Your Pin Code
            </p></div>

            {
                loading ?
                    <CircularProgress sx={{ mt: 5 }} /> :
                    <>

                        {
                            action === "change" &&
                            changePin()
                        }
                        {
                            action === "setup" &&
                            setupPin()
                        }
                        {
                            action === "disable" &&
                            disablePin()
                        }
                        {
                            action === "verify" &&
                            verifyPin()
                        }
                        {

                            <div className="btns" >
                                {action === "setup"
                                    && <button onClick={() => savePin(pin)} className="btn btn-primary playBtn">Save</button>
                                }
                                {
                                    !noEscape &&
                                    <button onClick={() => close()} className="btn btn-primary ">Cancel</button>
                                }
                            </div>

                        }




                    </>
            }


        </div>
    </Dialog>
}

export default ParentalLock;