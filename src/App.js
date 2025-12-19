import logo from './logo.svg';
import './App.css';
import Layout from './components/Layout/Layout';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <Layout />
    </NotificationProvider>
  );
}

export default App;
