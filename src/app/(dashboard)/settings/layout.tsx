type Props = {
    children: React.ReactNode
}

const SettingLayout = ({children}: Props) =>{
    return (
        <div className="">
            {children}
        </div>
    )
}

export default SettingLayout;