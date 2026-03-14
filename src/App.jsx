import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import {SignInWithGoogle, SignOut} from "./services/authentication.js"
import SearchBar from "./components/Searchbar.jsx"
import MapView from "./components/MapView.jsx"
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const [user, setUser] = useState(null);

  const [query, setQuery] = useState(null);

  const handleClick = () => {
    SignInWithGoogle().then(result => {
      setUser(result);
    });
  };

  const handleSearch = () => {
    if (query) {
      console.log("query", query)
    }
  }

  if (user) {
    return (
      <div style = {{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
           <button style={{padding: "4px", backgroundColor: "red"}} onClick = {handleClick}>Sign In With Google</button>    
      </div>
    )
  } else {
      return (
      <div style={{}}>
        <div>
          <SearchBar setSearchValue={setQuery} handleSearch={handleSearch} />
          </div>
        <div style={{}}>
          <MapView />
        </div>
      </div>
  )
}
}

export default App
