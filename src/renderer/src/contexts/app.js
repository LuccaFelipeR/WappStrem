import React, { createContext } from 'react';

const AppContext = createContext({
  user: null,
  toggleUser: () => { },
  dnsList: {
    list: null,
    toggleList: () => {}
  },
  streamData: {
    movies: {
      streams: null,
      streamCategories: null,
      banner: null,
      toggle: () => { },
      banner: {
        streams: null,
        toggle: () => { }
      }
    },
    series: {
      streams: null,
      streamCategories: null,
      toggle: () => { },
      banner: {
        streams: null,
        toggle: () => { }
      }
    },
    liveTv : {
      streams : null,
      streamCategories : null,
      toggle : () => {}
    },
    toggle: () => { }
  },
  epgSrc: {
    currentEpgSrc: null,
    toggle: () =>  {}
  },
  epgSrcList: {
    list: null,
    toggle: () => {}
  },
  alert: {
    title: "",
    show: false,
    type: "success",
    toggle: () => { }
  },
  parentalVerified: {
    status: false,
    toggle: () => { }
  },
  theme: {
    current: "dark",
    color : "purple",
    toggleTheme: () => {},
    toggleColor: () => {},
  },
  m3uStreams : {
    streams : {
      movies: null,
      series: null,
      live: null
    },
    toggle : () => {},
  },
  m3uUrl : {
    url : '',
    toggle : () => {}
  },
  homeM3uStreams: {
    streams: null,
    toggle: () => {}
  },
  m3uFileUpload: {
    uploading:  false,
    uploaded: false,
    progress: 0,
    toggle: () => {}
  },
  scrolled: {
    h: 0,
    m: 0,
    s: 0,
    toggle: () => {}
  },
  loading: {
    state: false,
    toggle: () => {}
  },
  currentPlayer: {
    player: 'flowplayer',
    toggle: () => {}
  }

});

export { AppContext };