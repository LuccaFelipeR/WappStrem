import React, { useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";

import "./styles.css";

export const CarouselItem = ({ children, width }) => {
  return (
    <div className="carousel-item" style={{ width: width }}>
      {children}
    </div>
  );
};

const Carousel = ({ children }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timer, setTimer] = useState(null)

  const updateIndex = (newIndex) => {
    if (newIndex < 0) {
      newIndex = React.Children.count(children) - 1;
    } else if (newIndex >= React.Children.count(children)) {
      newIndex = 0;
    }

    // setActiveIndex(newIndex);
  };

  useEffect(() => {
    if (children.length > 0 && !timer) {
      setTimer(
        setInterval(() => {
          // if (!paused) {
          // updateIndex(activeIndex + 1);
          setActiveIndex(prev => {
            updateIndex(prev === children.length - 1 ? 0 : prev + 1);
            return prev === children.length - 1 ? 0 : prev + 1
          })
          // }
        }, 3000)
      )
    }
    // return () => {
    //   if (interval) {
    //     clearInterval(interval);
    //   }
    // };
  }, [children]);

  const handlers = useSwipeable({
    onSwipedLeft: () => updateIndex(activeIndex + 1),
    onSwipedRight: () => updateIndex(activeIndex - 1)
  });

  return (
    <div
      {...handlers}
      className="carousel-dashboard"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="inner"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {React.Children.map(children, (child, index) => {
          return React.cloneElement(child, { width: "100%" });
        })}
      </div>
      <div className="indicators">
        {React.Children.map(children, (child, index) => {
          return (
            <div
              className={index === activeIndex ? "active-indicator" : "indicator"}
              onClick={() => {
                clearInterval(timer)
                setTimer(null)
                updateIndex(index);
                setActiveIndex(index);
                setTimeout(() => {
                  setTimer(
                    setInterval(() => {
                      setActiveIndex(prev => {
                        updateIndex(prev === children.length - 1 ? 0 : prev + 1);
                        return prev === children.length - 1 ? 0 : prev + 1
                      })
                    }, 3000)
                  )
                }, 2000);
              }}
            >
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Carousel;
