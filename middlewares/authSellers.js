

const authSeller = async (userID) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userID },
            include: { store: true }
        })
        if (user.store) {
           if (user.store.status === 'approved') {
                return user.store.id;
            }
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error authenticating seller:', error);
        return false
    }
}
  
export default authSeller;