import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FileSystemItem } from '../types';
import { Icons } from './Icon';

interface ExplorerProps {
  files: Record<string, FileSystemItem>;
  activeFileId: string | null;
  onFileClick: (id: string) => void;
  onUpload: (files: FileList) => void;
  onUploadEntries?: (entries: FileSystemEntry[]) => void;
  onDelete: (id: string) => void;
  onCreateFile: (name: string, parentId?: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onMoveItem: (itemId: string, targetParentId: string | null) => void;
  onDownloadItem: (item: FileSystemItem) => void;
}

// ── Recursively read a FileSystemEntry tree ───────────────────────────────
async function readEntryTree(entry: FileSystemEntry): Promise<{ path: string; file: File }[]> {
  if (entry.isFile) {
    return new Promise(resolve => {
      (entry as FileSystemFileEntry).file(
        f => resolve([{ path: entry.fullPath, file: f }]),
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allEntries: FileSystemEntry[] = [];
    // readEntries may return batches — keep reading until empty
    await new Promise<void>(resolve => {
      const readBatch = () => {
        reader.readEntries(batch => {
          if (batch.length === 0) { resolve(); return; }
          allEntries.push(...batch);
          readBatch();
        }, () => resolve());
      };
      readBatch();
    });
    const nested = await Promise.all(allEntries.map(readEntryTree));
    return nested.flat();
  }
  return [];
}

// ── FileItem row ──────────────────────────────────────────────────────────
const FileItem: React.FC<{
  item: FileSystemItem;
  depth: number;
  activeId: string | null;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  onNewItem: (type: 'file' | 'folder', parentId: string) => void;
  onMoveItem: (itemId: string, targetParentId: string | null) => void;
  onDownloadItem: (item: FileSystemItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}> = ({ item, depth, activeId, onClick, onDelete, onNewItem, onMoveItem, onDownloadItem, isCollapsed, onToggleCollapse }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  let Icon = item.type === 'folder' ? (isCollapsed ? Icons.Folder : Icons.FolderOpen) : Icons.File;
  if (item.mimeType?.startsWith('image')) Icon = Icons.Image;
  if (item.mimeType === 'application/pdf') Icon = Icons.FileText;
  if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) Icon = Icons.FileCode;

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/devmind-item-id', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Accept drops onto folders only
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving this element (not entering a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('application/devmind-item-id');
    if (draggedId && draggedId !== item.id) {
      onMoveItem(draggedId, item.id);
    }
  };

  return (
    <div
      className="group"
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`flex items-center py-1.5 cursor-pointer hover:bg-ide-activity text-sm select-none transition-colors
          ${activeId === item.id ? 'bg-ide-activity text-white font-bold' : 'text-gray-400'}
          ${isDragOver ? 'bg-ide-accent/20 ring-1 ring-ide-accent ring-inset' : ''}
        `}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={() => {
          if (item.type === 'folder') onToggleCollapse();
          else onClick(item.id);
        }}
      >
        <Icon size={16} strokeWidth={2.5} className={`mr-2.5 opacity-80 ${item.type === 'folder' ? 'text-ide-accent' : ''}`} />
        <span className="truncate flex-1">{item.name}</span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 pr-2 transition-opacity">
          {item.type === 'folder' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onNewItem('file', item.id); }} className="p-1 hover:text-white" title="New File">
                <Icons.Plus size={14} strokeWidth={2.5} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNewItem('folder', item.id); }} className="p-1 hover:text-white" title="New Folder">
                <Icons.FolderPlus size={14} strokeWidth={2.5} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDownloadItem(item); }} className="p-1 hover:text-white transition-colors" title="Download">
            <Icons.Upload size={14} strokeWidth={2.5} className="rotate-180" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1 hover:text-red-500 transition-colors" title="Delete">
            <Icons.Trash2 size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Explorer ──────────────────────────────────────────────────────────────
export const Explorer: React.FC<ExplorerProps> = ({
  files, activeFileId, onFileClick, onUpload, onUploadEntries,
  onDelete, onCreateFile, onCreateFolder, onMoveItem, onDownloadItem,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [namingState, setNamingState] = useState<{ type: 'file' | 'folder'; parentId: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (namingState && inputRef.current) inputRef.current.focus();
  }, [namingState]);

  const toggleCollapse = (id: string) => setCollapsedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleNamingSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newName.trim() && namingState) {
      if (namingState.type === 'file') onCreateFile(newName, namingState.parentId);
      else onCreateFolder(newName, namingState.parentId);
    }
    setNamingState(null);
    setNewName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onUpload(e.target.files);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // ── Root drag-over / drop ─────────────────────────────────────────────
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOverRoot(false);
    }
  };

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);

    // ── Internal move: item dragged within explorer ──────────────────────
    const draggedId = e.dataTransfer.getData('application/devmind-item-id');
    if (draggedId) {
      onMoveItem(draggedId, null);
      return;
    }

    // ── OS drop: use FileSystem API for recursive folder support ─────────
    const items = Array.from(e.dataTransfer.items);
    const entries = items
      .map(i => (i as any).webkitGetAsEntry?.() as FileSystemEntry | null)
      .filter(Boolean) as FileSystemEntry[];

    if (entries.length > 0 && onUploadEntries) {
      onUploadEntries(entries);
      return;
    }

    // Fallback: plain FileList (no folder support)
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }, [onMoveItem, onUpload, onUploadEntries]);

  const fileList = Object.values(files) as FileSystemItem[];
  const rootItems = fileList.filter(f => !f.parentId);

  const renderTree = (items: FileSystemItem[], depth = 0): React.ReactNode[] => {
    const sorted = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map(item => {
      const children = fileList.filter(f => f.parentId === item.id);
      const isTargetParent = namingState?.parentId === item.id;
      const collapsed = collapsedIds.has(item.id);

      return (
        <React.Fragment key={item.id}>
          <FileItem
            item={item}
            depth={depth}
            activeId={activeFileId}
            onClick={onFileClick}
            onDelete={onDelete}
            onNewItem={(type, parentId) => setNamingState({ type, parentId })}
            onMoveItem={onMoveItem}
            onDownloadItem={onDownloadItem}
            isCollapsed={collapsed}
            onToggleCollapse={() => toggleCollapse(item.id)}
          />
          {isTargetParent && namingState && (
            <div className="flex items-center py-1.5" style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}>
              {namingState.type === 'folder'
                ? <Icons.Folder size={16} strokeWidth={2.5} className="mr-2.5 text-ide-accent" />
                : <Icons.File size={16} strokeWidth={2.5} className="mr-2.5 opacity-80" />}
              <form onSubmit={handleNamingSubmit} className="flex-1 pr-4">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => handleNamingSubmit()}
                  className="w-full bg-ide-activity border border-ide-accent/50 text-xs text-white px-2 py-1 outline-none rounded font-bold"
                  placeholder={`New ${namingState.type}...`}
                />
              </form>
            </div>
          )}
          {item.type === 'folder' && !collapsed && renderTree(children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div
      className={`flex flex-col h-full bg-ide-sidebar border-r border-ide-border transition-colors ${isDragOverRoot ? 'bg-ide-accent/5 ring-1 ring-inset ring-ide-accent/30' : ''}`}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      <div className="flex items-center justify-between p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-ide-border shrink-0">
        <span>Explorer</span>
        <div className="flex items-center space-x-2">
          <button onClick={() => setNamingState({ type: 'file', parentId: null })} className="hover:text-white p-1" title="New File">
            <Icons.Plus size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => setNamingState({ type: 'folder', parentId: null })} className="hover:text-white p-1" title="New Folder">
            <Icons.FolderPlus size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="hover:text-white p-1" title="Upload Files">
            <Icons.Upload size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => folderInputRef.current?.click()} className="hover:text-white p-1" title="Upload Folder">
            <Icons.FolderOpen size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <input type="file" ref={folderInputRef} className="hidden" onChange={handleFolderChange}
        {...{ webkitdirectory: '', directory: '', multiple: '' } as any} />

      <div className="flex-1 overflow-y-auto pt-2 no-scrollbar">
        {!namingState && fileList.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-[10px] italic font-bold uppercase tracking-widest opacity-60">
            Drop files or folders here
          </div>
        )}
        {namingState?.parentId === null && (
          <div className="flex items-center py-2 px-4">
            {namingState.type === 'folder'
              ? <Icons.Folder size={16} strokeWidth={2.5} className="mr-2.5 text-ide-accent" />
              : <Icons.File size={16} strokeWidth={2.5} className="mr-2.5 opacity-80" />}
            <form onSubmit={handleNamingSubmit} className="flex-1">
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => handleNamingSubmit()}
                className="w-full bg-ide-activity border border-ide-accent/50 text-xs text-white px-2 py-1 outline-none rounded font-bold"
                placeholder={`New ${namingState.type}...`}
              />
            </form>
          </div>
        )}
        {renderTree(rootItems)}
      </div>
    </div>
  );
};

// ── Export the recursive entry reader for use in App.tsx ──────────────────
export { readEntryTree };
