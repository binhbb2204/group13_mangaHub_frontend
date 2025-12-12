import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Manga from '../pages/Manga'
import Library from '../pages/Library'
import Chat from '../pages/Chat'
import MangaDetails from './../pages/MangaDetails'
import TopRankedManga from '../pages/TopRankedManga'
import Settings from '../pages/Settings'
import ChatDetails from '../pages/ChatDetails'
import MangaReader from '../pages/MangaReader'
const Routers = () => {
  return (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manga" element={<Manga />} />
        <Route path="/library" element={<Library />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:id" element={<ChatDetails />} />
        <Route path="/manga/:id" element={<MangaDetails />} />
        <Route path="/read/:mangadexId/:chapterId" element={<MangaReader />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/top-ranked" element={<TopRankedManga />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default Routers