import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <Layout>
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center py-8">
                    <CardContent className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                        <p className="text-gray-600 mt-2 mb-8">
                            You do not have the required permissions to view this page. Please contact your administrator if you believe this is an error.
                        </p>
                        <Link href="/dashboard">
                            <Button variant="primary">Return to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
