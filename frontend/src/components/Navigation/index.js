// frontend/src/components/Navigation/index.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProfileButton from './ProfileButton';
import './Navigation.css';

function Navigation({ isLoaded }) {
  const sessionUser = useSelector(state => state.session.user);

  return (
    <ul className='navigation'>
      <div className='logo'>
        <NavLink exact to="/">
          <i class="fa-solid fa-house" />
        </NavLink>
        <span>HomeSweetHomeAway</span>
      </div>
      {isLoaded && (
        <ul>
          <ProfileButton user={sessionUser} />
        </ul>
      )}
    </ul>
  );
}

export default Navigation;
