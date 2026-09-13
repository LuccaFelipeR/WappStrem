import { useState, useRef, useEffect } from "react";
import "./styles.css"

const Scrollable = ({ children, style }) => {

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator?.userAgent))
    },[])
    const listRef = useRef(null)

    const [mouseDown, setMouseDown] = useState(false);
    const [startX, setStartX] = useState();
    const [scrollLeft, setScrollLeft] = useState();

    const handleRedirect = (action) => {
        listRef.current.childNodes.forEach(el => el.style.pointerEvents = action)
    }

    const stopDragging = (e) => {
        e.preventDefault()
        setMouseDown(false);
        handleRedirect("auto")
    };

    const handleListDown = (e) => {
        e.preventDefault();
        setMouseDown(true);
        setStartX(e.pageX - listRef.current.offsetLeft);
        setScrollLeft(listRef.current.scrollLeft);
    }

    const handlelistMove = (e) => {
        e.preventDefault();
        if (mouseDown) {
            const x = e.pageX - listRef.current.offsetLeft;
            const scroll = x - startX;
            listRef.current.scrollLeft = scrollLeft - scroll;
            handleRedirect("none")
        }
    }


    const handleTouchMove = (e) => {
        const x = e.touches[0].clientX - listRef.current.offsetLeft;
        const scroll = x - startX;
        listRef.current.scrollLeft = scrollLeft - scroll;
    }

    const handleTouchStart = (e) => {
        setMouseDown(true);
        setStartX(e.touches[0].clientX - listRef.current.offsetLeft);
        setScrollLeft(listRef.current.scrollLeft)
    }


    return <div
        style={style}
        className="scrollable-list"
        onMouseDown={!isMobile ? handleListDown : () => { }}
        onMouseUp={!isMobile ? stopDragging : () => { }}
        onMouseLeave={!isMobile ? stopDragging : () => { }}
        onMouseMove={!isMobile ? handlelistMove : () => { }}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={listRef}
    >
        {children}
    </div>
}

export default Scrollable;