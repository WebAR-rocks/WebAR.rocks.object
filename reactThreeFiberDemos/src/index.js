import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { Switch, Route, BrowserRouter as Router } from 'react-router-dom'

import './styles/index.scss'

import DemosMenu from './js/components/DemosMenu'

import DemoSprite from './js/demos/Sprite.js'
import DemoARCoffee from './js/demos/ARCoffee.js'
import DemoKeyboard from './js/demos/Keyboard.js'
import DemoCoin from './js/demos/Coin.js'

render(
  <AppContainer>
    <Router>
      <Switch>

        <Route path="/sprite">
          <DemoSprite />
        </Route>

        <Route path="/ARCoffee">
          <DemoARCoffee />
        </Route>
      
        <Route path="/keyboard">
          <DemoKeyboard />
        </Route>

        <Route path="/coin">
          <DemoCoin />
        </Route>

        <Route path="/">
          <DemosMenu />
        </Route>

      </Switch>
    </Router>
  </AppContainer>,
  document.querySelector('#root')
);