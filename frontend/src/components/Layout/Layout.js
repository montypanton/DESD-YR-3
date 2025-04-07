import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;