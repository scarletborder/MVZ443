// Docs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cacheDocContent, getDocContent, clearExpiredDocs, getDocsListFromIndexedDB } from '../utils/indexDB';
import { publicUrl } from '../utils/browser';
import { ArrowLeft, Search } from 'lucide-react';
import styled from 'styled-components';
import { useDeviceType } from '../hooks/useDeviceType';
import { boyerMooreSearch } from '../utils/algo';

type docType = {
    name: string;
    mod_time: string;
}

async function getDocsList(): Promise<docType[]> {
    const response = await fetch(`${publicUrl}/docs/stat.json`);
    if (!response.ok) {
        throw new Error('Failed to fetch docs list');
    }
    const data = await response.json();
    return data;
};

const Docs: React.FC = () => {
    const [docsList, setDocsList] = useState<docType[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredDocs, setFilteredDocs] = useState<Array<{ file: docType, preview: string }>>([]);
    const devicetype = useDeviceType();
    const navigate = useNavigate();

    const boyerMooreSearchAlgo = window.boyerMooreSearch ?? boyerMooreSearch;

    const refreshFiltered = useCallback(async () => {
        const processedDocs = await Promise.all(docsList.map(async (doc) => {
            const fileName = doc.name.replace('.md', '');
            let content = await getDocsListFromIndexedDB(fileName);
            // 如果内容不存在，尝试从服务器获取并缓存
            if (!content) {
                try {
                    const response = await fetch(`${publicUrl}/docs/${fileName}.md`);
                    if (response.ok) {
                        content = await response.text();
                        await cacheDocContent(fileName, content);
                    } else {
                        content = null;
                    }
                } catch (error) {
                    console.error(`Failed to fetch ${fileName}:`, error);
                    content = null;
                }
            }
            const preview = content ? content.slice(0, 50) + '...' : 'Loading preview...';

            if (!searchQuery) {
                return { file: doc, preview, matches: true };
            }

            const foundInName = fileName.toLowerCase().includes(searchQuery.toLowerCase());
            const foundInContent = content && boyerMooreSearchAlgo(content.toLowerCase(), searchQuery.toLowerCase());
            return { file: doc, preview, matches: foundInName || foundInContent };
        }));

        setFilteredDocs(processedDocs.filter(item => item.matches));
    }, [searchQuery, docsList]);

    useEffect(() => {
        const cacheDocuments = async () => {
            await clearExpiredDocs();
            const list = await getDocsList();
            setDocsList(list);

            for (const doc of list) {
                const fileName = doc.name.replace('.md', '');
                const content = await getDocContent(fileName);
                if (!content) {
                    const response = await fetch(`${publicUrl}/docs/${fileName}.md`);
                    const text = await response.text();
                    await cacheDocContent(fileName, text);
                }
            }
        };
        cacheDocuments();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            refreshFiltered();
        }, searchQuery === "" ? 0 : 500);
        return () => clearTimeout(timer);
    }, [searchQuery, docsList, refreshFiltered]);

    const handleDocClick = async (name: string) => {
        let content = await getDocContent(name);
        if (!content) {
            const response = await fetch(`${publicUrl}/docs/${name}.md`);
            const text = await response.text();
            await cacheDocContent(name, text);
        }
    };

    return (
        <PageContainer>
            <HeaderContainer deviceType={devicetype}>
                <BackButton onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </BackButton>
                <Title>Documents</Title>
                <SearchContainer deviceType={devicetype}>
                    <SearchIcon />
                    <SearchInput
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title or content"
                    />
                </SearchContainer>
            </HeaderContainer>
            <DocsGrid>
                {filteredDocs.map(({ file, preview }, index) => (
                    <DocCard key={index}>
                        <Link
                            to={`/docs/${file.name.replace('.md', '')}`}
                            onClick={() => handleDocClick(file.name.replace('.md', ''))}
                        >
                            <CardTitle>{file.name.replace('.md', '')}</CardTitle>
                            <CardModTime>Last modified: {new Date(file.mod_time).toLocaleString()}</CardModTime>
                            <CardPreview>{preview}</CardPreview>
                        </Link>
                    </DocCard>
                ))}
            </DocsGrid>
        </PageContainer>
    );
};

// Styled Components
const PageContainer = styled.div`
    min-height: 100vh;
    background-color: #1e1e1e;
    color: #ffffff;
    padding: 1rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
`;

const HeaderContainer = styled.div<{ deviceType: string }>`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: ${({ deviceType }) => deviceType === 'mobile' ? 'center' : 'flex-start'};
    position: relative;
    padding: 1rem 0;
`;

const BackButton = styled.button`
    background: none;
    border: none;
    color: #ffffff;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background-color 0.3s ease;
    align-self: center;
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
`;

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 600;
    margin: 1rem 0;
    text-align: center;
    letter-spacing: 0.02em;
`;

const SearchContainer = styled.div<{ deviceType: string }>`
    display: flex;
    align-items: center;
    width: ${({ deviceType }) => deviceType === 'mobile' ? '100%' : '300px'};
    ${({ deviceType }) => deviceType === 'pc' && `
        position: absolute;
        right: 0;
        top: 1.5rem;
    `}
    background: #2a2a2a;
    border-radius: 8px;
    padding: 0.5rem;
`;

const SearchIcon = styled(Search)`
    width: 20px;
    height: 20px;
    color: #888;
    margin: 0 0.5rem;
`;

const SearchInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 1rem;
    
    &:focus {
        outline: none;
    }
    &::placeholder {
        color: #888;
    }
`;

const DocsGrid = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding: 1rem 0;
    
    &::-webkit-scrollbar {
        width: 8px;
    }
    
    &::-webkit-scrollbar-track {
        background: #2a2a2a;
    }
    
    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }
`;

const DocCard = styled.div`
    background: #2a2a2a;
    border-radius: 8px;
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    a {
        text-decoration: none;
        color: inherit;
        display: block;
    }
`;

const CardTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0 0 0.5rem 0;
`;

const CardModTime = styled.p`
    font-size: 0.85rem;
    color: #888888;
    margin: 0 0 0.5rem 0;
`;

const CardReference = styled.p`
    font-size: 0.85rem;
    color: #888888;
    margin: 0 0 0.5rem 0;
`;

const CardPreview = styled.p`
    font-size: 0.9rem;
    color: #aaaaaa;
    margin: 0;
    line-height: 1.4;
`;

export default Docs;