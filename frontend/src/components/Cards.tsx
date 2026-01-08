import type { ICards } from "../models/LandingPageModel";

const Cards = (props: ICards) => {

    return(
        <>
            <div className="p-4 w-full max-w-sm border border-gray-200 rounded-2xl bg-emerald-50 shadow-sm flex flex-col items-start transition-all duration-300 ease-out hover:border-transparent hover:hover:shadow-[0_12px_32px_rgba(99,102,241,0.16)]">
                <props.icon className={`w-8 h-8 md:w-10 md:h-10 pb-2 ${props.color}`} />
                <h2 className="font-semibold text-lg md:text-xl pb-4">{props.title}</h2>
                <p className="text-xs md:text-sm text-gray-500">{props.description}</p>
            </div>
        </>
    )
}

export default Cards;