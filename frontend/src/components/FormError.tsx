import type {IFormError} from "../models/LandingPageModel";

const FormError = ({show, message}: IFormError) => {
    if (!show) return null;

    return(
       <p className="text-xs text-red-500 mb-0.5">
            {message} 
       </p>
    )
};

export default FormError;