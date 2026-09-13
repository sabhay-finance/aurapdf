import Foundation
import PDFKit
import Vision

let pdfPath = "public/uploads/1789231051170_CFA_LEVAL_1_BOOK_4__2027.pdf"
guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)) else {
    print("Failed to open PDF")
    exit(1)
}

guard let page = doc.page(at: 5) else { // 0-indexed: page 6
    print("Failed to get page 6")
    exit(1)
}

// Render page to image
let pageRect = page.bounds(for: .mediaBox)
let renderer = ImageRenderer(page: page, rect: pageRect)
if let cgImage = renderer.render() {
    let request = VNRecognizeTextRequest { request, error in
        guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
        var recognized = [String]()
        for obs in observations {
            if let topCandidate = obs.topCandidates(1).first {
                recognized.append(topCandidate.string)
            }
        }
        print("Recognized \(recognized.count) lines!")
        print("Sample:\n" + recognized.prefix(10).joined(separator: "\n"))
    }
    request.recognitionLevel = .accurate
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
} else {
    print("Failed to render page to cgImage")
}

class ImageRenderer {
    let page: PDFPage
    let rect: CGRect
    init(page: PDFPage, rect: CGRect) {
        self.page = page
        self.rect = rect
    }
    func render() -> CGImage? {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let width = Int(rect.width)
        let height = Int(rect.height)
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
            return nil
        }
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        page.draw(with: .mediaBox, to: context)
        return context.makeImage()
    }
}
