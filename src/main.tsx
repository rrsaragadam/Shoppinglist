import { render } from 'preact'
import './app.css'
import { App } from './app'
import { ShoppingListModel } from './model'

const model = new ShoppingListModel()

render(
  <App model={model} />,
  document.querySelector('#app')!
)
