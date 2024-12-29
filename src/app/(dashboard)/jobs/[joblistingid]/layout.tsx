export default function Layout({
                                   children,
                                   visitors,
                               }: {
    children: React.ReactNode
    visitors: React.ReactNode
}) {
    return (
        <>
            {children}
            {visitors}
        </>
    )
}