type Props = {
    children: React.ReactNode
}

const SettingLayout = ({children}: Props) =>{
    return (
        <div className="min-h-screen flex flex-col justify-center items-center">
            {children}
        </div>
    )
}

export default SettingLayout;