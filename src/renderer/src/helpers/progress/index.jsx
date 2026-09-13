import React from 'react'
import "./styles.css"

const Watched = ({progress}) => {
    return (
        <div style={{
            width: progress > 100 ? '100%' : progress < 0 ? 0 : `${progress}%`
        }} className='watched-prog'>
        </div>
    )
}

export default Watched