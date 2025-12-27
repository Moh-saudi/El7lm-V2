
const { Resend } = require('resend');

async function checkDomains() {
    const resend = new Resend('re_ARGLqa1w_LKvtJ9hCNpQAym8cQp7Pc2Qc');

    try {
        console.log('--- Checking Resend Domains ---');
        const { data, error } = await resend.domains.list();

        if (error) {
            console.error('Error listing domains:', error);
            return;
        }

        console.log('Domains found:', JSON.stringify(data, null, 2));

        if (data && data.data.length === 0) {
            console.log('No domains found. You need to add el7lm.com');
        } else {
            data.data.forEach(domain => {
                console.log(`Domain: ${domain.name}, Status: ${domain.status}`);
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkDomains();
