const DashboardCards = ({...props}) => {


    return(
        <>
            <div className={props.style}>
                <h3>{props.title}</h3>
                <div className="Chart">

                </div>
                <p>...</p>
            </div>
        </>
    )
}

export default DashboardCards;