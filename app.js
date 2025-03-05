const { useState, useEffect, useSyncExternalStore } = React;

function App() {
    const [activeTab, setActiveTab] = useState('gallery');
    const [generating, setGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [currentLabyrinthId, setCurrentLabyrinthId] = useState(null);
    
    // Get labyrinths from the database and subscribe to changes
    const labyrinths = useSyncExternalStore(
        labyrinthRoom.subscribeToLabyrinths,
        labyrinthRoom.getLabyrinthList
    );
    
    // Sort labyrinths by creation date (newest first)
    const sortedLabyrinths = [...labyrinths].sort((a, b) => 
        new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
    );
    
    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPreviewData(null);
    };
    
    // Handle generate labyrinth
    const handleGenerateLabyrinth = async (formData) => {
        setGenerating(true);
        try {
            // Step 1: Generate labyrinth description
            const textResult = await labyrinthGenerator.generateLabyrinthText(
                formData.theme, 
                formData.style, 
                formData.complexity
            );
            
            if (!textResult) {
                throw new Error("Failed to generate labyrinth description");
            }
            
            setPreviewData({
                title: textResult.title,
                description: textResult.description
            });
            
            // Step 2: Generate labyrinth image
            const imageUrl = await labyrinthGenerator.generateLabyrinthImage(textResult.description);
            
            if (!imageUrl) {
                throw new Error("Failed to generate labyrinth image");
            }
            
            setPreviewData(prev => ({
                ...prev,
                imageUrl
            }));
            
            // Step 3: Generate biome textures
            const textureData = await labyrinthGenerator.generateBiomeTextures(textResult.description);
            
            // Step 4: Save to database
            const savedLabyrinth = await labyrinthGenerator.saveLabyrinth(
                textResult.title,
                textResult.description,
                imageUrl,
                textureData
            );
            
            // Step 5: Switch to gallery tab to show the new labyrinth
            setActiveTab('gallery');
            setPreviewData(null);
            
        } catch (error) {
            console.error("Error generating labyrinth:", error);
            alert("An error occurred while generating your labyrinth. Please try again.");
        } finally {
            setGenerating(false);
        }
    };
    
    // Handle labyrinth selection
    const handleLabyrinthSelect = async (labyrinthId) => {
        setCurrentLabyrinthId(labyrinthId);
        setPlaying(true);
        
        // Create labyrinth engine
        const engine = new LabyrinthEngine('labyrinth-game-container');
        
        // Set stop callback
        engine.onStop = () => {
            setPlaying(false);
            setCurrentLabyrinthId(null);
        };
        
        // Initialize engine
        await engine.initialize(labyrinthId);
    };
    
    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            const music = document.getElementById('labyrinthMusic');
            if (music) {
                music.pause();
                music.currentTime = 0;
            }
        };
    }, []);
    
    return (
        <div className="app-container">
            <header className="header">
                <h1>This Labyrinth Does Not Exist</h1>
                <p className="description">
                    Explore procedurally generated labyrinths that extend infinitely, 
                    each with unique themes, architecture, and atmosphere.
                </p>
            </header>
            
            {!playing && (
                <>
                    <div className="tabs">
                        <button 
                            className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
                            onClick={() => handleTabChange('gallery')}>
                            Gallery
                        </button>
                        <button 
                            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => handleTabChange('create')}>
                            Create New Labyrinth
                        </button>
                    </div>
                    
                    {activeTab === 'gallery' ? (
                        <div className="gallery-container">
                            {sortedLabyrinths.length === 0 ? (
                                <div className="loading">
                                    <p>No labyrinths found. Create the first one!</p>
                                </div>
                            ) : (
                                sortedLabyrinths.map(labyrinth => (
                                    <div 
                                        key={labyrinth.id}
                                        className="labyrinth-card"
                                        onClick={() => handleLabyrinthSelect(labyrinth.id)}>
                                        <img 
                                            src={labyrinth.imageUrl} 
                                            alt={labyrinth.title}
                                            className="labyrinth-image" />
                                        <div className="labyrinth-info">
                                            <h3 className="labyrinth-title">{labyrinth.title}</h3>
                                            <p className="labyrinth-desc">{labyrinth.description}</p>
                                            <div className="creator-info">
                                                <img 
                                                    src={`https://images.websim.ai/avatar/${labyrinth.username}`} 
                                                    alt={labyrinth.username}
                                                    className="creator-avatar" />
                                                <span className="creator-name">{labyrinth.username}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="generator-container">
                            <h2>Create a New Labyrinth</h2>
                            <p>Fill in the details below to generate your unique labyrinth</p>
                            
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (generating) return;
                                
                                const formData = new FormData(e.target);
                                handleGenerateLabyrinth({
                                    theme: formData.get('theme'),
                                    style: formData.get('style'),
                                    complexity: formData.get('complexity')
                                });
                            }}>
                                <div className="form-group">
                                    <label htmlFor="theme">Labyrinth Theme</label>
                                    <input 
                                        type="text" 
                                        id="theme" 
                                        name="theme" 
                                        placeholder="e.g., Ancient Temple, Crystal Cave, Abandoned City"
                                        required />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="style">Architectural Style</label>
                                    <input 
                                        type="text" 
                                        id="style" 
                                        name="style" 
                                        placeholder="e.g., Gothic, Futuristic, Organic, Medieval"
                                        required />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="complexity">Complexity (1-10)</label>
                                    <input 
                                        type="range" 
                                        id="complexity" 
                                        name="complexity" 
                                        min="1" 
                                        max="10" 
                                        defaultValue="5" />
                                </div>
                                
                                <button type="submit" disabled={generating}>
                                    {generating ? 'Generating...' : 'Generate Labyrinth'}
                                </button>
                            </form>
                            
                            {generating && (
                                <div className="loading">
                                    <p>Generating your labyrinth... This may take a moment.</p>
                                </div>
                            )}
                            
                            {previewData && (
                                <div className="generated-preview">
                                    <h3>Preview</h3>
                                    {previewData.imageUrl && (
                                        <img 
                                            src={previewData.imageUrl} 
                                            alt={previewData.title}
                                            style={{ maxWidth: '100%', marginTop: '1rem' }} />
                                    )}
                                    {previewData.title && (
                                        <h4 style={{ marginTop: '1rem' }}>{previewData.title}</h4>
                                    )}
                                    {previewData.description && (
                                        <p style={{ marginTop: '0.5rem' }}>{previewData.description}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Render app
ReactDOM.createRoot(document.getElementById('app')).render(<App />);

