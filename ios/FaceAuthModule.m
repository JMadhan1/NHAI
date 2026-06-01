#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FaceAuthModule, NSObject)

RCT_EXTERN_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(detectFace:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(computeEmbedding:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(computeLandmarks:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(matchEmbedding:(NSArray *)embedding
                  storedEmbeddings:(NSArray *)storedEmbeddings
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
