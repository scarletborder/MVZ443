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
        try {
          const response = await fetch(`${publicUrl}/docs/${docName}.md`);
          if (response.ok) {
            const text = await response.text();
            // 检查是否获取到的是HTML页面而不是Markdown文件
            if (text.includes('<!doctype html>') || text.includes('<html')) {
              console.error('获取到HTML页面而不是Markdown文件');
              setDocContent('# 文档加载失败\n\n无法加载文档内容，请检查文档是否存在。');
              return;
            }
            cacheDocContent(docName, text); // 缓存到 IndexedDB
            content = text;
          } else {
            console.error(`文档 ${docName} 不存在`);
            setDocContent('# 文档不存在\n\n请求的文档不存在或已被删除。');
            return;
          }
        } catch (error) {
          console.error('获取文档失败:', error);
          setDocContent('# 文档加载失败\n\n网络错误，无法加载文档内容。');
          return;
        }
      }
      setDocContent(content);
    };

    fetchDoc();
  }, [name]);

  return (
    <PageContainer>
      <HeaderContainer>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </BackButton>
        <Title>{name}</Title>
      </HeaderContainer>
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
            img: ({ node, ...props }) => <StyledImg {...props} />,
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
  padding: 1rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
`;

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 900px;
  margin-bottom: 2rem;
  position: relative;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease, transform 0.2s ease;
  margin-right: 1rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }

  & svg {
    width: 24px;
    height: 24px;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  flex: 1;
  text-align: left;
`;

const ContentCard = styled.div`
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  line-height: 1.6;
  overflow-wrap: break-word;
  word-wrap: break-word;
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin: 0 0.5rem;
  }
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

const StyledImg = styled.img`
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  object-fit: contain;
  
  @media (max-width: 768px) {
    margin: 0.5rem auto;
    border-radius: 6px;
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
