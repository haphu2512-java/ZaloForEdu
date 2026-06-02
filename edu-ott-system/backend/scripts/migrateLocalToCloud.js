const { MongoClient } = require('mongodb');

const localUri = 'mongodb://admin:password123@127.0.0.1:27017/edu-ott-db?authSource=admin';
const remoteUri = 'mongodb+srv://ott_messaging:chubalatalang@cluster0.3vfgijz.mongodb.net/ott_messaging?retryWrites=true&w=majority';

async function migrate() {
    try {
        console.log('🔗 Đang kết nối tới Database Local (máy tính)...');
        const localClient = await MongoClient.connect(localUri);
        const localDb = localClient.db('edu-ott-db');
        console.log('✅ Đã kết nối Local!');

        console.log('\n🔗 Đang kết nối tới Database Cloud (Atlas)...');
        const remoteClient = await MongoClient.connect(remoteUri);
        const remoteDb = remoteClient.db('ott_messaging');
        console.log('✅ Đã kết nối Cloud!');

        console.log('\n🚀 BẮT ĐẦU CHUYỂN DỮ LIỆU...');

        const collections = await localDb.listCollections().toArray();
        
        for (const collInfo of collections) {
            const collName = collInfo.name;
            if (collName.startsWith('system.')) continue;
            
            console.log(`\n📦 Đang xử lý Collection: [${collName}]`);
            
            const localCollection = localDb.collection(collName);
            const remoteCollection = remoteDb.collection(collName);

            const docs = await localCollection.find({}).toArray();
            console.log(`   -> Tìm thấy ${docs.length} bản ghi ở Local`);

            if (docs.length > 0) {
                try {
                    await remoteCollection.drop();
                    console.log(`   -> Đã dọn sạch Collection cũ trên Cloud`);
                } catch (e) {
                    // Bỏ qua lỗi nếu collection chưa tồn tại trên cloud
                }
                
                await remoteCollection.insertMany(docs);
                console.log(`   -> ✅ Đã bơm thành công ${docs.length} bản ghi lên Cloud!`);
            } else {
                console.log(`   -> ⏩ Bỏ qua (Collection trống)`);
            }
        }

        console.log('\n🎉 CHÚC MỪNG! CHUYỂN DỮ LIỆU THÀNH CÔNG TỐT ĐẸP!');
        await localClient.close();
        await remoteClient.close();
    } catch (error) {
        console.error('\n❌ Lỗi trong quá trình chuyển dữ liệu:', error.message);
        process.exit(1);
    }
}

migrate();
