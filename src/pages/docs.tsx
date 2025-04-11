// Docs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cacheDocContent, getDocContent, clearExpiredDocs, getDocsListFromIndexedDB } from '../utils/indexDB';
import { boyerMooreSearch } from '../utils/algo';
import { publicUrl } from '../utils/browser';
import { ArrowLeft, Search } from 'lucide-react';
import styled from 'styled-components';
import { useDeviceType } from '../hooks/useDeviceType';

const getDocsList = (): string[] => {
    return ['monsterEDX.md'];
};

const Docs: React.FC = () => {
    const [docsList, setDocsList] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredDocs, setFilteredDocs] = useState<Array<{ file: string, preview: string }>>([]);
    const deviceType = useDeviceType();
    const navigate = useNavigate();

    const refreshFiltered = useCallback(async () => {
        const processedDocs = await Promise.all(docsList.map(async (file) => {
            const fileName = file.replace('.md', '');
            let content = await getDocsListFromIndexedDB(fileName);
            const preview = content ? content.slice(0, 50) + '...' : 'Loading preview...';

            if (!searchQuery) {
                return { file, preview, matches: true };
            }

            const foundInName = fileName.toLowerCase().includes(searchQuery.toLowerCase());
            const foundInContent = content && boyerMooreSearch(content.toLowerCase(), searchQuery.toLowerCase());
            return { file, preview, matches: foundInName || foundInContent };
        }));

        setFilteredDocs(processedDocs.filter(item => item.matches));
    }, [searchQuery, docsList]);

    useEffect(() => {
        clearExpiredDocs();
        const list = getDocsList();
        setDocsList(list);

        const cacheDocuments = async () => {
            for (const doc of list) {
                const fileName = doc.replace('.md', '');
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
            <HeaderContainer deviceType={deviceType}>
                <BackButton onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </BackButton>
                <Title>Documents</Title>
                <SearchContainer deviceType={deviceType}>
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
                            to={`/docs/${file.replace('.md', '')}`}
                            onClick={() => handleDocClick(file.replace('.md', ''))}
                        >
                            <CardTitle>{file.replace('.md', '')}</CardTitle>
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
    flex-direction: ${({ deviceType }) => deviceType === 'mobile' ? 'column' : 'row'};
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

const CardPreview = styled.p`
    font-size: 0.9rem;
    color: #aaaaaa;
    margin: 0;
    line-height: 1.4;
`;

export default Docs;