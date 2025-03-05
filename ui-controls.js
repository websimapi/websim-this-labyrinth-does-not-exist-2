class UIControls {
    constructor() {
        this.activeTab = 'gallery';
        this.isGenerating = false;
    }
    
    renderTabs() {
        return (
            <div className="tabs">
                <button 
                    className={`tab ${this.activeTab === 'gallery' ? 'active' : ''}`}
                    onClick={() => this.setActiveTab('gallery')}>
                    Gallery
                </button>
                <button 
                    className={`tab ${this.activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => this.setActiveTab('create')}>
                    Create New Labyrinth
                </button>
            </div>
        );
    }
    
    setActiveTab(tab) {
        this.activeTab = tab;
        if (typeof this.onTabChange === 'function') {
            this.onTabChange(tab);
        }
    }
    
    renderGeneratorForm(onSubmit) {
        return (
            <div className="generator-container">
                <h2>Create a New Labyrinth</h2>
                <p>Fill in the details below to generate your unique labyrinth</p>
                
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (this.isGenerating) return;
                    
                    this.isGenerating = true;
                    const formData = new FormData(e.target);
                    
                    try {
                        if (typeof onSubmit === 'function') {
                            await onSubmit({
                                theme: formData.get('theme'),
                                style: formData.get('style'),
                                complexity: formData.get('complexity')
                            });
                        }
                    } catch (error) {
                        console.error("Error submitting form:", error);
                    } finally {
                        this.isGenerating = false;
                    }
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
                    
                    <button type="submit" disabled={this.isGenerating}>
                        {this.isGenerating ? 'Generating...' : 'Generate Labyrinth'}
                    </button>
                </form>
            </div>
        );
    }
    
    renderGallery(labyrinths, onLabyrinthSelect) {
        if (!labyrinths || labyrinths.length === 0) {
            return (
                <div className="loading">
                    <p>No labyrinths found. Create the first one!</p>
                </div>
            );
        }
        
        return (
            <div className="gallery-container">
                {labyrinths.map(labyrinth => (
                    <div 
                        key={labyrinth.id}
                        className="labyrinth-card"
                        onClick={() => {
                            if (typeof onLabyrinthSelect === 'function') {
                                onLabyrinthSelect(labyrinth.id);
                            }
                        }}>
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
                ))}
            </div>
        );
    }
    
    renderGenerationPreview(previewData) {
        if (!previewData) return null;
        
        return (
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
        );
    }
}

// Initialize
const uiControls = new UIControls();

