import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import StorySetup from './pages/StorySetup';
import StoryEditor from './pages/StoryEditor';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import AITools from './pages/AITools';
import AdminDashboard from './pages/AdminDashboard';

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="narrative-ui-theme">
            <BrowserRouter>
                <Routes>
                    {/* Main App Routes */}
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="new" element={<StorySetup />} />
                        <Route path="story/current" element={<StoryEditor />} />
                        <Route path="story/:id" element={<StoryEditor />} />
                        <Route path="profile" element={<Profile />} />
                    </Route>

                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    
                    {/* Admin Route */}
                    <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
