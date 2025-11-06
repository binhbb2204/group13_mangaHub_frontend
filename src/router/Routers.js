import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Manga from '../pages/Manga'
import Chat from '../pages/Chat'
import MangaDetails from './../pages/MangaDetails'
const Routers = () => {
  return (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manga" element={<Manga />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:id" element={<MangaDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default Routers