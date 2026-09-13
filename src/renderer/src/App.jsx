import { HashRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import Landing from './pages/landing'
import Login from "./pages/login"
import Player from "./pages/player"
import Layout from './layout'
import Profiles from './pages/profiles'
import Dashboard from './pages/dashboard'
import MoviePreview from './pages/dashboard/preview/movies/[item]'
import SeriesPreview from './pages/dashboard/preview/series/[item]'
import LiveTv from './pages/dashboard/live/common'
import CatchUp from './pages/dashboard/catchup'
import LoginM3u from './pages/login/m3u'
import { BackHand } from '@mui/icons-material';
import {NavigateBack} from './helpers/goBack'
import M3uList from './pages/dashboard/home'
import M3uPlayer from './pages/dashboard/home/player'
import MoviePreviewM3u from './pages/dashboard/preview/movies/m3u/[item]'
import SeriesPreviewM3u from './pages/dashboard/preview/series/m3u/[item]'
import Live from './pages/dashboard/live'
import ErrorBoundary from './helpers/errorBoundary/error'

function App() {

  return (
    <Layout>
      <HashRouter>
    <ErrorBoundary>

        <NavigateBack/>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/login' element={<Login />} />
          <Route path='/login/m3u' element={<LoginM3u />} />
          <Route path='/playlists' element={<Profiles />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/dashboard/preview/movies/:item' element={<MoviePreview />} />
          <Route path='/dashboard/preview/series/:item' element={<SeriesPreview />} />
          <Route path='/dashboard/live' element={<Live />} />
          <Route path='/dashboard/catchup' element={<CatchUp />} />
          <Route path='/dashboard/home' element={<M3uList />} />
          <Route path='/dashboard/home/player' element={<M3uPlayer />} />
          <Route path='/dashboard/preview/movies/m3u/:item' element={<MoviePreviewM3u />} />
          <Route path='/dashboard/preview/series/m3u/:item' element={<SeriesPreviewM3u />} />
        </Routes>
    </ErrorBoundary>

      </HashRouter>
    </Layout>
  )
}

export default App

