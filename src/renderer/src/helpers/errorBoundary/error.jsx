import React from "react"
import "./style.css"
import { AppContext } from "../../contexts/app"
import { useNavigate } from "react-router-dom"


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)

        this.state = { hasError: false }
    }
    static contextType = AppContext;
    static getDerivedStateFromError(error) {
        return { hasError: true }
    }
    componentDidCatch(error, errorInfo) {
        console.log({ error, errorInfo })
    }

    navigateToMovies = () => {
        const { navigate } = this.props;
        navigate('/dashboard?view=movies');
        this.setState({ hasError: false })
    }

    render() {
        // Check if the error is thrown
        const { theme } = this.context;

        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="error-popup">
                    <h2><b style={{ color: 'rgb(223, 0, 0)' }} >Oops</b>,  Something went wrong!</h2>
                    <div className="btns-container">

                        <button
                            type="button"
                            className={`back-btn`}
                            onClick={this.navigateToMovies}
                        >
                            Go Back
                        </button>
                        <button
                            type="button"
                            className={`${theme.color}`}
                            onClick={() => this.setState({ hasError: false })}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )
        }

        // Return children components in case of no error

        return this.props.children
    }
}

function withNavigation(Component) {
    return  function WrappedComponent(props) {
        const navigate = useNavigate();
        return <Component {...props} navigate={navigate} />;
    };
}

export default withNavigation(ErrorBoundary)