import React, { useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { FileSystemItem, SettingsState } from '../types';
import { Icons } from './Icon';

interface EditorAreaProps {
    openFiles: FileSystemItem[];
    activeFileId: string | null;
    settings: SettingsState;
    onChange: (value: string | undefined) => void;
    onMount?: (editor: any, monaco: any) => void;
    onTabClick: (id: string) => void;
    onTabClose: (id: string, e: React.MouseEvent) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({ 
    openFiles, 
    activeFileId, 
    settings,
    onChange, 
    onMount, 
    onTabClick, 
    onTabClose 
}) => {
    const monaco = useMonaco();
    const activeFile = openFiles.find(f => f.id === activeFileId) || null;

    useEffect(() => {
        if (monaco) {
            monaco.editor.setTheme(settings.theme === 'light' ? 'vs' : 'vs-dark');
        }
    }, [monaco, settings.theme]);

    if (openFiles.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-ide-bg select-none">
                <Icons.Code size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Ready to code</p>
                <p className="text-xs mt-2 opacity-50">Open a file or ask the Agent to generate code</p>
            </div>
        );
    }

    const renderContent = () => {
        if (!activeFile) return null;
        
        const isImage = activeFile.mimeType?.startsWith('image/');
        const isPdf = activeFile.mimeType === 'application/pdf';

        if (isImage) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-black/40 p-10 overflow-auto">
                    <div className="bg-white p-2 rounded shadow-2xl">
                        <img src={activeFile.content || ''} alt={activeFile.name} className="max-w-full max-h-[70vh] object-contain" />
                    </div>
                    <div className="mt-4 text-xs text-gray-400 flex items-center space-x-4">
                        <span>{activeFile.name}</span>
                        <span>Image Viewer</span>
                    </div>
                </div>
            );
        }

        if (isPdf) {
            return (
                <div className="h-full w-full flex flex-col bg-ide-bg">
                    <div className="flex-1 bg-ide-activity m-4 rounded overflow-hidden shadow-lg border border-ide-border">
                        <iframe src={activeFile.content || ''} className="w-full h-full border-0" title={activeFile.name} />
                    </div>
                </div>
            );
        }

        return (
            <Editor
                height="100%"
                path={activeFile.path}
                language={activeFile.language || 'javascript'}
                value={activeFile.content || ''}
                theme={settings.theme === 'light' ? 'vs' : 'vs-dark'}
                onChange={onChange}
                onMount={onMount}
                options={{
                    minimap: { enabled: true },
                    fontSize: settings.editorFontSize,
                    wordWrap: settings.editorWordWrap,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2
                }}
            />
        );
    };

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-ide-bg">
            <div className="flex bg-ide-sidebar border-b border-ide-border overflow-x-auto no-scrollbar h-10 flex-shrink-0">
                {openFiles.map(file => {
                    let FileIcon = Icons.File;
                    if (file.mimeType?.startsWith('image')) FileIcon = Icons.Image;
                    if (file.name.endsWith('ts') || file.name.endsWith('tsx')) FileIcon = Icons.FileCode;
                    const isActive = file.id === activeFileId;

                    return (
                        <div key={file.id} onClick={() => onTabClick(file.id)}
                            className={`group flex items-center min-w-[120px] max-w-[200px] px-3 py-2 text-xs border-r border-ide-border cursor-pointer select-none transition-all
                                ${isActive ? 'bg-ide-bg text-ide-textHover border-t-2 border-t-ide-accent shadow-sm' : 'bg-ide-sidebar text-gray-500 hover:bg-ide-activity'}
                            `}
                        >
                            <FileIcon size={14} className={`mr-2 flex-shrink-0 ${isActive ? 'text-ide-accent' : ''}`} />
                            <span className="truncate flex-1">{file.name}</span>
                            <button onClick={(e) => onTabClose(file.id, e)} className={`ml-2 p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 ${isActive ? 'opacity-100' : ''}`}>
                                <Icons.X size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex-1 overflow-hidden relative">
                {renderContent()}
            </div>
        </div>
    );
};