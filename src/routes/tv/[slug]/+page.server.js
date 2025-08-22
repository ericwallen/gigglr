// Just pass the slug to the client-side component
export async function load({ params }) {
    const { slug } = params;

    return {
        slug
    };
}
