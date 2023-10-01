const Chapter = require('../models/chapterModel');

const addChapter = async ({ header, content, bookId, orderId, state }) => {
    try {
        // const greatestOrderId = await Chapter.findOne(
        //     { bookId: bookId },
        //     { orderId: 1 }
        // )
        //     .sort({ orderId: -1 })
        //     .limit(1);

        // let correctOrderId = orderId;
        // if (greatestOrderId && (orderId < 1 || orderId > greatestOrderId.orderId + 1)) {
        //     correctOrderId = greatestOrderId.orderId + 1;
        // } else if (!greatestOrderId) {
        //     correctOrderId = 1;
        // }

        const chapter = await Chapter.create({
            header,
            content,
            bookId,
            orderId,
            state,
        });

        return chapter;
    } catch (error) {
        throw new Error(error);
    }
};

module.exports = { addChapter }