import jwt from 'jsonwebtoken';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Invalid token.' });
    }
};
//# sourceMappingURL=authMiddleware.js.map