// DocDetail.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cacheDocContent, getDocContent } from '../utils/indexDB';
import { publicUrl } from '../utils/browser';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';

const DocDetail: React.FC = () => {
    const { name } = useParams<{ name: string }>(); // 获取路由中的参数
    const [docContent, setDocContent] = useState<string>('');
    const navigate = useNavigate(); // 使用 useNavigate 来处理导航  

    const handleBack = () => {
        navigate(-1);
    };

    useEffect(() => {
        const fetchDoc = async () => {
            var docName = name || "default"; // 如果没有参数，则使用默认值

            let content = await getDocContent(docName); // 从 IndexedDB 获取文档内容
            if (!content) {
                // 如果没有缓存，发起请求并缓存
                const response = await fetch(`${publicUrl}/docs/${docName}.md`);
                const text = await response.text();
                cacheDocContent(docName, text); // 缓存到 IndexedDB
                content = text;
            }
            setDocContent(content);
        };

        fetchDoc();
    }, [name]);

    return (
        <PageContainer>
            <BackButton onClick={() => navigate(-1)}>
                <ArrowLeft size={24} />
            </BackButton>
            <Title>{name}</Title>
            <ContentCard>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ node, ...props }) => <StyledH1 {...props} />,
                        h2: ({ node, ...props }) => <StyledH2 {...props} />,
                        ul: ({ node, ...props }) => <StyledUl {...props} />,
                        li: ({ node, ...props }) => <StyledLi {...props} />,
                        p: ({ node, ...props }) => <StyledP {...props} />,
                        a: ({ node, ...props }) => <StyledA {...props} />,
                        input: ({ node, ...props }) => (
                            <StyledCheckbox
                                type="checkbox"
                                disabled={props.disabled}
                                checked={props.checked}
                                readOnly
                            />
                        ),
                    }}
                >
                    {docContent}
                </ReactMarkdown>
            </ContentCard>
        </PageContainer>
    );
};


// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  box-sizing: border-box;
`;

const BackButton = styled.button`
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 1rem; /* 增大内边距，扩展点击区域 */
  border-radius: 50%;
  width: 60px; /* 固定宽度 */
  height: 60px; /* 固定高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease, transform 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.1); /* 悬停时略微放大 */
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }

  & svg {
    width: 30px; /* 增大图标尺寸 */
    height: 30px;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 1rem 0 2rem;
  text-align: center;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const ContentCard = styled.div`
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 2rem;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  line-height: 1.6;
`;

const StyledH1 = styled.h1`
  font-size: 1.8rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  color: #ffffff;
`;

const StyledH2 = styled.h2`
  font-size: 1.4rem;
  font-weight: 500;
  margin: 1.2rem 0 0.8rem;
  color: #e0e0e0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.3rem;
`;

const StyledUl = styled.ul`
  margin: 0.5rem 0;
  padding-left: 2rem;
`;

const StyledLi = styled.li`
  margin: 0.3rem 0;
  font-size: 1rem;
`;

const StyledP = styled.p`
  margin: 0.5rem 0;
  font-size: 1rem;
`;

const StyledA = styled.a`
  color: #60a5fa;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #93c5fd;
    text-decoration: underline;
  }
`;

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 4px;
  position: relative;
  vertical-align: middle;
  margin-right: 0.5rem;
  cursor: not-allowed; // Since it's disabled

  // Unchecked state ([ ])
  &:not(:checked) {
    background-color: #ffffff;
    border: 1px solid #ffffff;
  }

  // Checked state ([x])
  &:checked {
    background-color: #4caf50;
    border: 1px solid #4caf50;
  }

  // Checkmark
  &:checked::after {
    content: '✔';
    color: #ffffff;
    font-size: 0.8rem;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  // Disabled styling
  &:disabled {
    opacity: 0.8;
  }
`;

export default DocDetail;
