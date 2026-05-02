import {auth} from "@clerk/nextjs/server";

type Props = {
    children: React.ReactNode
}

const SettingLayout = async ({children}: Props) =>{

    return (
        <div className="">
            {children}
        </div>
    )
}

export default SettingLayout;