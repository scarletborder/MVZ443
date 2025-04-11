import { useNavigate } from "react-router-dom";
import Settings from "../components/menu/settings";

type Props = {
    width: number;
    height: number;
}

export default function SettingsPage({ width, height }: Props) {
    const navigate = useNavigate();
    const handleBack = () => {
        navigate(-1);
    };
    return (
        <div
            style={{
                // 居中
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100vw',
                height: '100vh',
            }}>
            <Settings
                width={width}
                height={height}
                onBack={handleBack}
            />
        </div>
    );
}